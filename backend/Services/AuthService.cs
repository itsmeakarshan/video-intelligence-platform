using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Isopoh.Cryptography.Argon2;
using Microsoft.IdentityModel.Tokens;

namespace VideoIntelligencePlatform.Backend.Services;

public class AuthService : IAuthService
{
    private readonly string _jwtSecretKey;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public AuthService(IConfiguration configuration)
    {
        _jwtSecretKey = configuration["JwtSecretKey"] 
            ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
            ?? "vip_super_secret_jwt_key_local_dev_2026_secure";
    }

    public string HashPassword(string password)
    {
        return Argon2.Hash(password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(passwordHash))
            return false;

        try
        {
            return Argon2.Verify(passwordHash, password);
        }
        catch
        {
            return false;
        }
    }

    public string CreateAccessToken(int userId, string role = "student")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("user_id", userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return _tokenHandler.WriteToken(token);
    }

    public (int? UserId, string? Role) DecodeAccessTokenWithRole(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return (null, null);

        try
        {
            token = token.Trim().Trim('"');
            if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                token = token.Substring(7).Trim();
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecretKey));
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };

            var principal = _tokenHandler.ValidateToken(token, validationParameters, out _);
            var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier) 
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub) 
                ?? principal.FindFirst("user_id");

            int? userId = null;
            if (subClaim != null && int.TryParse(subClaim.Value, out int parsedId))
            {
                userId = parsedId;
            }

            var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value 
                ?? principal.FindFirst("role")?.Value 
                ?? "student";

            return (userId, roleClaim);
        }
        catch
        {
            return (null, null);
        }
    }

    public int? DecodeAccessToken(string token)
    {
        var (userId, _) = DecodeAccessTokenWithRole(token);
        return userId;
    }
}
