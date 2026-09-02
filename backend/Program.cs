using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;
using VideoIntelligencePlatform.Backend.Services;

// ----------------------------------------------------
// Helper to Load .env Files
// ----------------------------------------------------
void LoadEnvFile()
{
    var currentDir = Directory.GetCurrentDirectory();
    var parentDir = Directory.GetParent(currentDir)?.FullName ?? currentDir;

    var candidatePaths = new[]
    {
        Path.Combine(currentDir, ".env"),
        Path.Combine(currentDir, "backend", ".env"),
        Path.Combine(parentDir, ".env"),
        Path.Combine(parentDir, "backend", ".env")
    };

    foreach (var path in candidatePaths)
    {
        if (File.Exists(path))
        {
            Console.WriteLine($"[Config] Loading environment variables from {path}");
            foreach (var line in File.ReadAllLines(path))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#") || !trimmed.Contains("="))
                    continue;

                var parts = trimmed.Split('=', 2);
                var key = parts[0].Trim();
                var val = parts[1].Trim().Trim('"', '\'');

                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, val);
                }
            }
            break;
        }
    }
}

LoadEnvFile();

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------
// Determine Database Path
// ----------------------------------------------------
var rawDbPath = Environment.GetEnvironmentVariable("DATABASE_PATH") 
    ?? builder.Configuration["DatabasePath"] 
    ?? "video_intelligence.db";

string dbFullPath;
if (Path.IsPathRooted(rawDbPath))
{
    dbFullPath = rawDbPath;
}
else
{
    var curr = Directory.GetCurrentDirectory();
    var parent = Directory.GetParent(curr)?.FullName ?? curr;

    var possibleLocations = new[]
    {
        Path.Combine(curr, rawDbPath),
        Path.Combine(curr, "video_intelligence.db"),
        Path.Combine(curr, "backend", rawDbPath),
        Path.Combine(curr, "backend", "video_intelligence.db"),
        Path.Combine(parent, rawDbPath),
        Path.Combine(parent, "backend", "video_intelligence.db")
    };

    var targetPath = Path.Combine(curr, rawDbPath);
    var existingSeed = possibleLocations.FirstOrDefault(File.Exists);
    if (!File.Exists(targetPath) && existingSeed != null && existingSeed != targetPath)
    {
        var targetDir = Path.GetDirectoryName(targetPath);
        if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }
        try
        {
            File.Copy(existingSeed, targetPath, overwrite: false);
            Console.WriteLine($"[Database] Initialized {targetPath} from seed template: {existingSeed}");
        }
        catch (Exception copyEx)
        {
            Console.WriteLine($"[Database Note] Could not copy seed template: {copyEx.Message}");
        }
    }

    dbFullPath = possibleLocations.FirstOrDefault(File.Exists) ?? targetPath;
}

var dbDir = Path.GetDirectoryName(dbFullPath);
if (!string.IsNullOrEmpty(dbDir) && !Directory.Exists(dbDir))
{
    Directory.CreateDirectory(dbDir);
}

// ----------------------------------------------------
// Ensure Uploads & Thumbnails are populated (handles empty Docker volumes on EC2)
// ----------------------------------------------------
void EnsureUploadsSeeded()
{
    var currentDir = Directory.GetCurrentDirectory();
    var possibleSeedDirs = new[]
    {
        Path.Combine(currentDir, "seed_uploads"),
        Path.Combine(currentDir, "backend", "seed_uploads"),
        Path.Combine(AppContext.BaseDirectory, "seed_uploads"),
        Path.Combine("/app/backend/seed_uploads")
    };

    var seedDir = possibleSeedDirs.FirstOrDefault(Directory.Exists);
    if (seedDir == null) return;

    var uploadsDir = Path.Combine(currentDir, "uploads");
    Directory.CreateDirectory(uploadsDir);

    void CopyDirectoryRecursively(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(source))
        {
            var destFile = Path.Combine(target, Path.GetFileName(file));
            if (!File.Exists(destFile) || new FileInfo(destFile).Length == 0)
            {
                File.Copy(file, destFile, overwrite: true);
            }
        }
        foreach (var subDir in Directory.GetDirectories(source))
        {
            var destSub = Path.Combine(target, Path.GetFileName(subDir));
            CopyDirectoryRecursively(subDir, destSub);
        }
    }

    try
    {
        CopyDirectoryRecursively(seedDir, uploadsDir);
        Console.WriteLine($"[Media Seed] Uploads directory synchronized from {seedDir}");
    }
    catch (Exception seedEx)
    {
        Console.WriteLine($"[Media Seed Note] Could not sync seed media: {seedEx.Message}");
    }
}

EnsureUploadsSeeded();

Console.WriteLine("============================================================");
Console.WriteLine("VIDEO INTELLIGENCE PLATFORM (.NET C# BACKEND)");
Console.WriteLine($"Database Path : {dbFullPath}");
Console.WriteLine("============================================================");

// ----------------------------------------------------
// Configure EF Core & SQLite
// ----------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite($"Data Source={dbFullPath}");
});

// ----------------------------------------------------
// Configure JWT Authentication
// ----------------------------------------------------
var jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
    ?? builder.Configuration["JwtSecretKey"] 
    ?? "vip_super_secret_jwt_key_local_dev_2026_secure";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ----------------------------------------------------
// Configure CORS
// ----------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ----------------------------------------------------
// Configure HTTP Client & Application Services
// ----------------------------------------------------
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IVideoService, VideoService>();
builder.Services.AddScoped<IYouTubeService, YouTubeService>();
builder.Services.AddScoped<ITranscriptionService, TranscriptionService>();
builder.Services.AddScoped<IChunkingService, ChunkingService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddSingleton<IPromptService, PromptService>();
builder.Services.AddScoped<IGeminiService, GeminiService>();
builder.Services.AddScoped<IMemoryService, MemoryService>();
builder.Services.AddScoped<IQueryRewriterService, QueryRewriterService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<IKnowledgeProfileService, KnowledgeProfileService>();
builder.Services.AddScoped<ILearningAnalyticsService, LearningAnalyticsService>();
builder.Services.AddScoped<IYouTubeRecommendationService, YouTubeRecommendationService>();

// ----------------------------------------------------
// Register Background Queue Worker
// ----------------------------------------------------
builder.Services.AddHostedService<QueueWorkerHostedService>();

// ----------------------------------------------------
// Configure Controllers with Snake_Case JSON Naming
// ----------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

var app = builder.Build();

// Ensure DB directory and tables
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(200) NOT NULL,
                description VARCHAR(2000) NOT NULL,
                thumbnail_url VARCHAR(500),
                user_id INTEGER,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS instructor_chat_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                instructor_id INTEGER,
                title VARCHAR(200) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(instructor_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS instructor_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                sender_role VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                message_type VARCHAR(50) NOT NULL,
                media_url VARCHAR(500),
                file_name VARCHAR(255),
                file_size INTEGER,
                extra_data TEXT,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(channel_id) REFERENCES instructor_chat_channels(id) ON DELETE CASCADE,
                FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS promotion_banners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(250) NOT NULL,
                subtitle VARCHAR(500),
                discount_tag VARCHAR(100),
                image_url VARCHAR(500) NOT NULL,
                target_url VARCHAR(500),
                is_active INTEGER NOT NULL DEFAULT 1,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_by_user_id INTEGER,
                created_at DATETIME NOT NULL
            );

            CREATE TABLE IF NOT EXISTS course_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                enrolled_at DATETIME NOT NULL,
                amount_paid NUMERIC NOT NULL DEFAULT 0.0,
                FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(course_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME NOT NULL
            );
        ");

        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        // Check videos table columns
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "PRAGMA table_info(videos);";
        using var reader = cmd.ExecuteReader();
        var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (reader.Read())
        {
            existingColumns.Add(reader["name"].ToString() ?? string.Empty);
        }
        reader.Close();

        if (!existingColumns.Contains("course_id"))
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE videos ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;");
        }
        if (!existingColumns.Contains("order_index"))
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE videos ADD COLUMN order_index INTEGER DEFAULT 1;");
        }
        if (!existingColumns.Contains("title"))
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE videos ADD COLUMN title VARCHAR(255);");
        }

        // Check courses table columns
        using var courseCmd = connection.CreateCommand();
        courseCmd.CommandText = "PRAGMA table_info(courses);";
        using var courseReader = courseCmd.ExecuteReader();
        var courseColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (courseReader.Read())
        {
            courseColumns.Add(courseReader["name"].ToString() ?? string.Empty);
        }
        courseReader.Close();

        if (!courseColumns.Contains("price"))
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE courses ADD COLUMN price NUMERIC NOT NULL DEFAULT 0.0;");
        }

        Console.WriteLine($"[Database] Database initialized at: {dbFullPath}");

        // ----------------------------------------------------
        // Seed Demo Users (Admin & Students)
        // Strictly preserves existing data; only seeds missing accounts
        // ----------------------------------------------------
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var existingUsers = db.Users.ToList();

        if (existingUsers.Any())
        {
            Console.WriteLine($"[Database] Existing users preserved: {existingUsers.Count} user(s) found in database.");
        }

        var seedUsers = new[]
        {
            new { Name = "Administrator", Email = "admin@example.com", Password = "admin123", Role = "admin" },
            new { Name = "Administrator", Email = "admin@ex.com", Password = "password", Role = "admin" },
            new { Name = "User", Email = "user@ex.com", Password = "password", Role = "student" },
            new { Name = "Alex Johnson", Email = "student1@learn.com", Password = "Student1@123", Role = "student" }
        };

        foreach (var su in seedUsers)
        {
            var normalizedEmail = su.Email.Trim().ToLowerInvariant();
            var existing = db.Users.FirstOrDefault(u => u.Email == normalizedEmail);
            if (existing == null)
            {
                var user = new User
                {
                    Name = su.Name,
                    Email = normalizedEmail,
                    PasswordHash = authService.HashPassword(su.Password),
                    Role = su.Role,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
                db.SaveChanges();

                if (su.Role == "admin")
                {
                    Console.WriteLine($"[Database] Demo admin account created: {su.Email} (Role: {su.Role})");
                }
                else
                {
                    Console.WriteLine($"[Database] Demo student account created: {su.Email} (Role: {su.Role})");
                }
            }
        }

        // Only seed starter course if the database has ZERO courses (fresh deploy)
        if (!db.Courses.Any())
        {
            var adminUser = db.Users.FirstOrDefault(u => u.Role == "admin");
            var starterCourses = new[]
            {
                new Course
                {
                    Title = "Computer",
                    Description = "Fundamental computer hardware, operating system architectures, and core software concepts.",
                    UserId = adminUser?.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };
            db.Courses.AddRange(starterCourses);
            db.SaveChanges();
            Console.WriteLine("[Database] Seeded starter course for fresh deployment.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB Migration Note] {ex.Message}");
    }
}

var uploadsThumbnailsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "thumbnails");
if (!Directory.Exists(uploadsThumbnailsDir))
{
    Directory.CreateDirectory(uploadsThumbnailsDir);
}

var uploadsChatMediaDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "chat_media");
if (!Directory.Exists(uploadsChatMediaDir))
{
    Directory.CreateDirectory(uploadsChatMediaDir);
}

var uploadsBannersDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "banners");
if (!Directory.Exists(uploadsBannersDir))
{
    Directory.CreateDirectory(uploadsBannersDir);
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "8000";
app.Run($"http://0.0.0.0:{port}");
