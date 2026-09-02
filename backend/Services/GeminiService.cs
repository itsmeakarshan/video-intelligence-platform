using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _db;
    private static string? _cachedApiKey;
    private readonly string _model;
    private readonly IPromptService _promptService;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient httpClient, AppDbContext db, IConfiguration configuration, IPromptService promptService, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _db = db;
        _promptService = promptService;
        _logger = logger;
        _model = configuration["GeminiModel"] 
            ?? Environment.GetEnvironmentVariable("GEMINI_MODEL") 
            ?? "gemini-3.5-flash";

        if (_cachedApiKey == null)
        {
            try
            {
                var setting = _db.SystemSettings.AsNoTracking().FirstOrDefault(s => s.Key == "gemini_api_key");
                if (setting != null && !string.IsNullOrWhiteSpace(setting.Value))
                {
                    _cachedApiKey = setting.Value.Trim();
                }
            }
            catch { }

            if (string.IsNullOrWhiteSpace(_cachedApiKey))
            {
                var envKey = configuration["GeminiApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
                if (!string.IsNullOrWhiteSpace(envKey))
                {
                    _cachedApiKey = envKey.Trim();
                }
            }
        }
    }

    public string? GetActiveApiKey() => _cachedApiKey;

    public string GetMaskedApiKey()
    {
        if (string.IsNullOrWhiteSpace(_cachedApiKey)) return string.Empty;
        if (_cachedApiKey.Length <= 8) return new string('*', _cachedApiKey.Length);
        return $"{_cachedApiKey[..4]}...{_cachedApiKey[^4..]}";
    }

    public bool UpdateApiKey(string newKey)
    {
        if (string.IsNullOrWhiteSpace(newKey)) return false;
        var clean = newKey.Trim();
        _cachedApiKey = clean;

        try
        {
            var setting = _db.SystemSettings.FirstOrDefault(s => s.Key == "gemini_api_key");
            if (setting == null)
            {
                _db.SystemSettings.Add(new SystemSetting
                {
                    Key = "gemini_api_key",
                    Value = clean,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                setting.Value = clean;
                setting.UpdatedAt = DateTime.UtcNow;
            }
            _db.SaveChanges();
            _logger.LogInformation("Gemini API key saved in system_settings database table.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save Gemini API key in database.");
            return false;
        }
    }

    public bool RemoveApiKey()
    {
        _cachedApiKey = null;
        try
        {
            var setting = _db.SystemSettings.FirstOrDefault(s => s.Key == "gemini_api_key");
            if (setting != null)
            {
                _db.SystemSettings.Remove(setting);
                _db.SaveChanges();
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove Gemini API key from database.");
            return false;
        }
    }

    public async Task<(bool Success, string Message, string? Model)> TestApiKeyAsync(string? testKey = null)
    {
        var keyToUse = !string.IsNullOrWhiteSpace(testKey) ? testKey.Trim() : _cachedApiKey;
        if (string.IsNullOrWhiteSpace(keyToUse))
        {
            return (false, "No API key provided to test. Please enter a Gemini API key.", null);
        }

        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={keyToUse}";
            var requestObj = new JsonObject
            {
                ["contents"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["parts"] = new JsonArray
                        {
                            new JsonObject { ["text"] = "Respond with 'OK' if you can read this." }
                        }
                    }
                },
                ["generationConfig"] = new JsonObject
                {
                    ["maxOutputTokens"] = 10
                }
            };

            using var content = new StringContent(requestObj.ToJsonString(), Encoding.UTF8, "application/json");
            using var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                return (true, $"Connection successful! {_model} is responsive.", _model);
            }

            var err = await response.Content.ReadAsStringAsync();
            try
            {
                using var doc = JsonDocument.Parse(err);
                if (doc.RootElement.TryGetProperty("error", out var errorElem) &&
                    errorElem.TryGetProperty("message", out var msgElem))
                {
                    return (false, $"Gemini API Error ({response.StatusCode}): {msgElem.GetString()}", _model);
                }
            }
            catch { }

            return (false, $"Gemini API returned status {(int)response.StatusCode}: {response.ReasonPhrase}", _model);
        }
        catch (Exception ex)
        {
            return (false, $"Connection error: {ex.Message}", _model);
        }
    }

    public async Task<string> GenerateContentAsync(string prompt, int maxTokens = 4096, string? systemInstruction = null, string? responseMimeType = null)
    {
        if (string.IsNullOrWhiteSpace(_cachedApiKey))
        {
            return "Gemini API key is not configured. Please add your Gemini API key using the 'Gemini API Key' button in the chat header.";
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_cachedApiKey}";

        var requestObj = new JsonObject
        {
            ["contents"] = new JsonArray
            {
                new JsonObject
                {
                    ["parts"] = new JsonArray
                    {
                        new JsonObject { ["text"] = prompt }
                    }
                }
            }
        };

        var genConfig = new JsonObject
        {
            ["maxOutputTokens"] = maxTokens
        };

        if (!string.IsNullOrWhiteSpace(responseMimeType))
        {
            genConfig["responseMimeType"] = responseMimeType;
        }

        requestObj["generationConfig"] = genConfig;

        if (!string.IsNullOrWhiteSpace(systemInstruction))
        {
            requestObj["systemInstruction"] = new JsonObject
            {
                ["parts"] = new JsonArray
                {
                    new JsonObject { ["text"] = systemInstruction }
                }
            };
        }

        for (int attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                using var content = new StringContent(requestObj.ToJsonString(), Encoding.UTF8, "application/json");
                using var response = await _httpClient.PostAsync(url, content);

                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    return "The AI service has reached its current Gemini API quota. Please wait for the quota to reset or use a Gemini API project with available quota.";
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Gemini error (attempt {Attempt}): {Status} - {Body}", attempt, response.StatusCode, errorBody);

                    if ((int)response.StatusCode >= 500 && attempt < 2)
                    {
                        await Task.Delay((int)Math.Pow(2, attempt) * 1000);
                        continue;
                    }

                    return "The AI service could not process the request. Please check the Gemini API configuration.";
                }

                var responseString = await response.Content.ReadAsStringAsync();
                var jsonNode = JsonNode.Parse(responseString);
                var parts = jsonNode?["candidates"]?[0]?["content"]?["parts"]?.AsArray();

                string? text = null;
                if (parts != null)
                {
                    var textParts = new List<string>();
                    foreach (var part in parts)
                    {
                        var t = part?["text"]?.GetValue<string>();
                        if (!string.IsNullOrWhiteSpace(t) && part?["thoughtSignature"] == null)
                        {
                            textParts.Add(t);
                        }
                    }
                    if (textParts.Any())
                    {
                        text = string.Join("", textParts);
                    }
                    else if (parts.Count > 0)
                    {
                        text = parts.LastOrDefault()?["text"]?.GetValue<string>();
                    }
                }

                if (string.IsNullOrWhiteSpace(text))
                {
                    return "I couldn't generate an answer from the available information.";
                }

                return text.Trim();

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception calling Gemini API (attempt {Attempt})", attempt);
                if (attempt >= 2)
                {
                    return "An unexpected error occurred while generating the AI response.";
                }
                await Task.Delay((int)Math.Pow(2, attempt) * 1000);
            }
        }

        return "Sorry, Gemini is currently unavailable.";
    }

    public async IAsyncEnumerable<string> StreamContentAsync(string prompt, int maxTokens = 4096, string? systemInstruction = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_cachedApiKey))
        {
            yield return "Gemini API key is not configured. Please add your Gemini API key using the 'Gemini API Key' button in the chat header.";
            yield break;
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:streamGenerateContent?alt=sse&key={_cachedApiKey}";

        var requestObj = new JsonObject
        {
            ["contents"] = new JsonArray
            {
                new JsonObject
                {
                    ["parts"] = new JsonArray
                    {
                        new JsonObject { ["text"] = prompt }
                    }
                }
            },
            ["generationConfig"] = new JsonObject
            {
                ["maxOutputTokens"] = maxTokens
            }
        };

        if (!string.IsNullOrWhiteSpace(systemInstruction))
        {
            requestObj["system_instruction"] = new JsonObject
            {
                ["parts"] = new JsonArray
                {
                    new JsonObject { ["text"] = systemInstruction }
                }
            };
        }

        using var content = new StringContent(requestObj.ToJsonString(), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Gemini stream returned error {StatusCode}: {Error}", response.StatusCode, err);
            yield return "Error calling Gemini streaming API.";
            yield break;
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line == null) break;
            if (string.IsNullOrWhiteSpace(line)) continue;

            if (line.StartsWith("data: "))
            {
                var json = line.Substring(6).Trim();
                if (json == "[DONE]") break;

                string? chunkText = null;
                try
                {
                    var node = JsonNode.Parse(json);
                    chunkText = node?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();
                }
                catch { }

                if (!string.IsNullOrEmpty(chunkText))
                {
                    yield return chunkText;
                }
            }
        }
    }

    public Task<string> AskGeminiAsync(string question, string context)
    {
        var prompt = _promptService.BuildChatPrompt(question, context);
        return GenerateContentAsync(prompt, maxTokens: 4096, systemInstruction: _promptService.ChatSystemInstruction);
    }

    public Task<string> AskSummaryAsync(string context)
    {
        var prompt = _promptService.BuildSummaryPrompt(context);
        return GenerateContentAsync(prompt, maxTokens: 4096);
    }

    public Task<string> AskNotesAsync(string context)
    {
        var prompt = _promptService.BuildNotesPrompt(context);
        return GenerateContentAsync(prompt, maxTokens: 4096);
    }

    public Task<string> AskQuizAsync(string context, string difficulty = "Medium", int questions = 10, List<string>? skills = null)
    {
        var prompt = _promptService.BuildQuizPrompt(context, difficulty, questions, skills);
        return GenerateContentAsync(prompt, maxTokens: 8192, responseMimeType: "application/json");
    }

    public Task<string> AskCourseSkillsAsync(string courseTitle, string context)
    {
        var prompt = _promptService.BuildCourseSkillsPrompt(courseTitle, context);
        return GenerateContentAsync(prompt, maxTokens: 8192, responseMimeType: "application/json");
    }

}
