using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace VideoIntelligencePlatform.Backend.Services;

public class TranscriptionService : ITranscriptionService
{
    private readonly HttpClient _httpClient;
    private readonly IGeminiService _geminiService;
    private readonly ILogger<TranscriptionService> _logger;
    private readonly string _tempAudioFolder;
    private readonly string _whisperModel;
    private readonly string _geminiApiKey;
    private readonly string _geminiModel;

    public TranscriptionService(HttpClient httpClient, IGeminiService geminiService, IConfiguration configuration, ILogger<TranscriptionService> logger)
    {
        _httpClient = httpClient;
        _geminiService = geminiService;
        _logger = logger;
        _tempAudioFolder = configuration["TempAudioFolder"] ?? "temp_audio";
        _whisperModel = Environment.GetEnvironmentVariable("WHISPER_MODEL") ?? configuration["WhisperModel"] ?? "base";
        _geminiApiKey = configuration["GeminiApiKey"] 
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
            ?? string.Empty;
        _geminiModel = configuration["GeminiModel"] 
            ?? Environment.GetEnvironmentVariable("GEMINI_MODEL") 
            ?? "gemini-3.5-flash";
        Directory.CreateDirectory(_tempAudioFolder);
    }

    public async Task<string> PreprocessVideoToAudioAsync(string videoPath)
    {
        var resolvedVideoPath = videoPath;
        if (!File.Exists(resolvedVideoPath))
        {
            var candidates = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), videoPath),
                Path.Combine(Directory.GetCurrentDirectory(), "backend", videoPath),
                Path.Combine(Directory.GetCurrentDirectory(), "..", videoPath),
                Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(videoPath)),
                Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(videoPath)),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(videoPath))
            };
            resolvedVideoPath = candidates.FirstOrDefault(File.Exists) ?? videoPath;
        }
        resolvedVideoPath = Path.GetFullPath(resolvedVideoPath);

        var audioPath = Path.GetFullPath(Path.Combine(_tempAudioFolder, $"{Guid.NewGuid()}.mp3"));

        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = $"-y -i \"{resolvedVideoPath}\" -vn -ar 16000 -ac 1 -b:a 32k \"{audioPath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(psi);
        if (process == null)
        {
            throw new InvalidOperationException("Failed to start ffmpeg process.");
        }

        await process.WaitForExitAsync();

        if (process.ExitCode != 0 || !File.Exists(audioPath))
        {
            // Fallback simpler ffmpeg command
            var psiSimple = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = $"-y -i \"{resolvedVideoPath}\" \"{audioPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var processSimple = Process.Start(psiSimple);
            if (processSimple != null)
            {
                await processSimple.WaitForExitAsync();
            }
        }

        if (!File.Exists(audioPath))
        {
            throw new InvalidOperationException($"FFmpeg failed to extract audio from '{videoPath}'.");
        }

        return audioPath;
    }

    public async Task<TranscriptionResult> TranscribeVideoAsync(string videoPath, Action<int, string>? progressCallback = null)
    {
        progressCallback?.Invoke(10, "Extracting audio from video...");
        var audioPath = await PreprocessVideoToAudioAsync(videoPath);

        progressCallback?.Invoke(15, "Running speech recognition...");

        try
        {
            // 1. Try local Whisper script if present and configured
            var localResult = await TryLocalWhisperAsync(audioPath, progressCallback);
            if (localResult != null)
            {
                return localResult;
            }

            // 2. Fallback to Gemini Multimodal Audio Transcription
            _logger.LogInformation("Using Gemini Multimodal Audio Transcription for {VideoPath}", videoPath);
            progressCallback?.Invoke(20, "Analyzing audio with AI speech model...");
            return await TranscribeWithGeminiAsync(audioPath, progressCallback);
        }
        finally
        {
            if (File.Exists(audioPath))
            {
                try { File.Delete(audioPath); } catch { }
            }
        }
    }

    private async Task<TranscriptionResult?> TryLocalWhisperAsync(string audioPath, Action<int, string>? progressCallback)
    {
        var curr = Directory.GetCurrentDirectory();
        var candidatesRoot = new[]
        {
            curr,
            Directory.GetParent(curr)?.FullName ?? curr,
            Path.GetFullPath(Path.Combine(curr, ".."))
        };

        string scriptPath = "";
        foreach (var root in candidatesRoot)
        {
            var p1 = Path.Combine(root, "ml", "src", "transcribe.py");
            if (File.Exists(p1)) { scriptPath = Path.GetFullPath(p1); break; }
            var p2 = Path.Combine(root, "backend", "ml", "src", "transcribe.py");
            if (File.Exists(p2)) { scriptPath = Path.GetFullPath(p2); break; }
        }

        if (string.IsNullOrEmpty(scriptPath))
        {
            return null; // Fall through to Gemini
        }

        string pythonExe = "";
        foreach (var root in candidatesRoot)
        {
            var venvPython = Path.Combine(root, "ml", ".venv", "bin", "python3");
            if (File.Exists(venvPython)) { pythonExe = Path.GetFullPath(venvPython); break; }
            var venvPython2 = Path.Combine(root, "ml", ".venv", "bin", "python");
            if (File.Exists(venvPython2)) { pythonExe = Path.GetFullPath(venvPython2); break; }
            var venvPython3 = Path.Combine(root, "backend", "ml", ".venv", "bin", "python3");
            if (File.Exists(venvPython3)) { pythonExe = Path.GetFullPath(venvPython3); break; }
        }

        if (string.IsNullOrEmpty(pythonExe))
        {
            pythonExe = "python3";
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = pythonExe,
                Arguments = $"\"{scriptPath}\" --audio \"{Path.GetFullPath(audioPath)}\" --model \"{_whisperModel}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return null;

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0 || string.IsNullOrWhiteSpace(stdout))
            {
                _logger.LogWarning("Local Whisper script failed or is unconfigured: {Stderr}. Falling back to Gemini.", stderr);
                return null;
            }

            var jsonStart = stdout.IndexOf('{');
            var jsonEnd = stdout.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                stdout = stdout.Substring(jsonStart, jsonEnd - jsonStart + 1);
            }

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            };

            var parsed = JsonSerializer.Deserialize<TranscriptionResultRaw>(stdout, jsonOptions);
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.FullText)) return null;

            progressCallback?.Invoke(38, "Speech recognition completed.");

            return new TranscriptionResult
            {
                Language = parsed.Language ?? "en",
                FullText = parsed.FullText ?? string.Empty,
                Segments = parsed.Segments?.Select(s => new TranscriptionSegmentResult
                {
                    SegmentIndex = s.SegmentIndex,
                    Start = s.Start,
                    End = s.End,
                    Text = s.Text
                }).ToList() ?? new List<TranscriptionSegmentResult>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local whisper execution threw an error. Falling back to Gemini.");
            return null;
        }
    }

    private async Task<TranscriptionResult> TranscribeWithGeminiAsync(string audioPath, Action<int, string>? progressCallback)
    {
        var apiKey = _geminiService.GetActiveApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = _geminiApiKey;
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured. Please add your Gemini API key from the frontend.");
        }

        var audioBytes = await File.ReadAllBytesAsync(audioPath);
        var base64Audio = Convert.ToBase64String(audioBytes);

        var prompt = @"Listen to this audio recording carefully and transcribe all spoken content accurately with timestamps.
Break down the transcription into chronological, logical segments (sentences or natural clauses).
Return ONLY a valid JSON object strictly matching this schema:
{
  ""language"": ""en"",
  ""full_text"": ""Complete and comprehensive transcript text of the whole audio"",
  ""segments"": [
    {
      ""segment_index"": 1,
      ""start"": 0.0,
      ""end"": 4.5,
      ""text"": ""Spoken words in this timestamp interval""
    }
  ]
}

CRITICAL TIMESTAMP RULES:
- All timestamps MUST be TOTAL ELAPSED SECONDS from the start of the audio as decimal numbers.
- For example:
  - 45 seconds is 45.0
  - 1 minute 29 seconds is 89.0 (60 + 29 = 89.0; NEVER write 129 or 1.29)
  - 2 minutes 15 seconds is 135.0 (120 + 15 = 135.0; NEVER write 215 or 2.15)
- Do NOT output clock digits or MMSS. Always convert minutes to pure seconds (minutes * 60 + seconds).
Do not wrap in markdown or backticks. Return raw JSON.";

        var requestObj = new JsonObject
        {
            ["contents"] = new JsonArray
            {
                new JsonObject
                {
                    ["parts"] = new JsonArray
                    {
                        new JsonObject { ["text"] = prompt },
                        new JsonObject
                        {
                            ["inlineData"] = new JsonObject
                            {
                                ["mimeType"] = "audio/mp3",
                                ["data"] = base64Audio
                            }
                        }
                    }
                }
            },
            ["generationConfig"] = new JsonObject
            {
                ["responseMimeType"] = "application/json"
            }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_geminiModel}:generateContent?key={apiKey}";

        using var content = new StringContent(requestObj.ToJsonString(), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(url, content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogError("Gemini audio transcription failed: {Status} - {Error}", response.StatusCode, err);
            throw new InvalidOperationException($"AI Transcription service error: {response.StatusCode} - {err}");
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseJson);

        if (!doc.RootElement.TryGetProperty("candidates", out var candidatesElem) || candidatesElem.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Gemini returned no candidates in response.");
        }

        var candidate = candidatesElem[0];
        string? textPart = null;

        if (candidate.TryGetProperty("content", out var contentElem) &&
            contentElem.TryGetProperty("parts", out var partsElem) &&
            partsElem.GetArrayLength() > 0 &&
            partsElem[0].TryGetProperty("text", out var textElem))
        {
            textPart = textElem.GetString();
        }

        if (string.IsNullOrWhiteSpace(textPart))
        {
            var finishReason = candidate.TryGetProperty("finishReason", out var fr) ? fr.GetString() : "UNKNOWN";
            throw new InvalidOperationException($"Gemini speech recognition returned empty content (finish reason: {finishReason}).");
        }

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        var parsed = JsonSerializer.Deserialize<TranscriptionResultRaw>(textPart, jsonOptions);
        if (parsed == null || string.IsNullOrWhiteSpace(parsed.FullText))
        {
            throw new InvalidOperationException("Failed to deserialize transcription JSON from Gemini.");
        }

        progressCallback?.Invoke(38, "Speech recognition completed.");

        return new TranscriptionResult
        {
            Language = parsed.Language ?? "en",
            FullText = parsed.FullText ?? string.Empty,
            Segments = parsed.Segments?.Select(s => new TranscriptionSegmentResult
            {
                SegmentIndex = s.SegmentIndex,
                Start = NormalizeTimestamp(s.Start),
                End = NormalizeTimestamp(s.End),
                Text = s.Text
            }).ToList() ?? new List<TranscriptionSegmentResult>()
        };
    }

    private static double NormalizeTimestamp(double rawSeconds)
    {
        if (rawSeconds >= 100.0)
        {
            int mm = (int)(rawSeconds / 100.0);
            double ss = rawSeconds - (mm * 100.0);
            if (ss < 60.0)
            {
                return Math.Round((mm * 60.0) + ss, 2);
            }
        }
        return Math.Round(rawSeconds, 2);
    }

    private class TranscriptionResultRaw
    {
        public string? Language { get; set; }
        public string? FullText { get; set; }
        public List<TranscriptionSegmentResultRaw>? Segments { get; set; }
    }

    private class TranscriptionSegmentResultRaw
    {
        public int SegmentIndex { get; set; }
        public double Start { get; set; }
        public double End { get; set; }
        public string Text { get; set; } = string.Empty;
    }
}
