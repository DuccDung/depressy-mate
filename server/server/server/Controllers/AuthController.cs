using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Controllers;

public class AuthController : Controller
{
    private readonly DepressyMateContext _context;

    public AuthController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToLocal(returnUrl);
        }

        return View(new LoginViewModel { ReturnUrl = returnUrl });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var email = model.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
        {
            ModelState.AddModelError(string.Empty, "Email hoặc mật khẩu không đúng.");
            return View(model);
        }

        await SignInUserAsync(user);
        return RedirectToLocal(model.ReturnUrl);
    }

    [HttpGet]
    public IActionResult Register(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToLocal(returnUrl);
        }

        return View(new RegisterViewModel { ReturnUrl = returnUrl });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var email = model.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(item => item.Email == email);
        if (emailExists)
        {
            ModelState.AddModelError(nameof(model.Email), "Email này đã được đăng ký.");
            return View(model);
        }

        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
            Role = "USER",
            FullName = model.FullName.Trim(),
            AuthProvider = "local",
            IsEmailVerified = false,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = model.FullName.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await SignInUserAsync(user);
        return RedirectToLocal(model.ReturnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Facebook(string? returnUrl = null)
    {
        var callbackUrl = Url.Action(nameof(FacebookCallback), "Auth", new { returnUrl }, Request.Scheme);
        var properties = new AuthenticationProperties
        {
            RedirectUri = callbackUrl
        };

        return Challenge(properties, FacebookDefaults.AuthenticationScheme);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Google(string? returnUrl = null)
    {
        var callbackUrl = Url.Action(nameof(GoogleCallback), "Auth", new { returnUrl }, Request.Scheme);
        var properties = new AuthenticationProperties
        {
            RedirectUri = callbackUrl
        };

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet]
    public async Task<IActionResult> FacebookCallback(string? returnUrl = null)
    {
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            TempData["AuthError"] = "Không thể đăng nhập bằng Facebook. Vui lòng thử lại.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var facebookId = authResult.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(facebookId))
        {
            TempData["AuthError"] = "Facebook không trả về mã người dùng hợp lệ.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var facebookEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        var fullName = authResult.Principal.FindFirstValue(ClaimTypes.Name);
        var avatarUrl = authResult.Principal.FindFirstValue("urn:facebook:picture");
        var email = string.IsNullOrWhiteSpace(facebookEmail)
            ? $"facebook_{facebookId}@facebook.local"
            : facebookEmail.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.FacebookId == facebookId);

        user ??= await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null)
        {
            user = CreateFacebookUser(facebookId, email, fullName, avatarUrl, facebookEmail is not null);
            _context.Users.Add(user);
        }
        else
        {
            UpdateFacebookUser(user, facebookId, fullName, avatarUrl, facebookEmail is not null);
        }

        await _context.SaveChangesAsync();
        await SignInUserAsync(user);

        return RedirectToLocal(returnUrl);
    }

    [HttpGet]
    public async Task<IActionResult> GoogleCallback(string? returnUrl = null)
    {
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            TempData["AuthError"] = "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var googleEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(googleEmail))
        {
            TempData["AuthError"] = "Google không trả về email hợp lệ.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var email = googleEmail.Trim().ToLowerInvariant();
        var fullName = authResult.Principal.FindFirstValue(ClaimTypes.Name);
        var avatarUrl = authResult.Principal.FindFirstValue("urn:google:picture");

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null)
        {
            user = CreateGoogleUser(email, fullName, avatarUrl);
            _context.Users.Add(user);
        }
        else
        {
            UpdateGoogleUser(user, fullName, avatarUrl);
        }

        await _context.SaveChangesAsync();
        await SignInUserAsync(user);

        return RedirectToLocal(returnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

    private async Task SignInUserAsync(User user)
    {
        var fullName = user.Profile?.FullName ?? user.FullName ?? user.Email;
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, fullName),
            new(ClaimTypes.Role, user.Role)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
            });
    }

    private IActionResult RedirectToLocal(string? returnUrl)
    {
        if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
        {
            return Redirect(returnUrl);
        }

        return RedirectToAction("Index", "Home");
    }

    private static User CreateFacebookUser(
        string facebookId,
        string email,
        string? fullName,
        string? avatarUrl,
        bool isEmailVerified)
    {
        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var displayName = string.IsNullOrWhiteSpace(fullName) ? email : fullName.Trim();

        return new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword($"facebook:{Guid.NewGuid():N}"),
            Role = "USER",
            AvatarUrl = avatarUrl,
            FacebookId = facebookId,
            FullName = displayName,
            AuthProvider = "facebook",
            IsEmailVerified = isEmailVerified,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            }
        };
    }

    private static void UpdateFacebookUser(
        User user,
        string facebookId,
        string? fullName,
        string? avatarUrl,
        bool isEmailVerified)
    {
        var now = DateTime.UtcNow;
        var displayName = string.IsNullOrWhiteSpace(fullName)
            ? user.FullName ?? user.Profile?.FullName ?? user.Email
            : fullName.Trim();

        user.FacebookId = facebookId;
        user.AuthProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "facebook" : user.AuthProvider;
        user.FullName = displayName;
        user.AvatarUrl = avatarUrl ?? user.AvatarUrl;
        user.IsEmailVerified = user.IsEmailVerified || isEmailVerified;
        user.UpdatedAt = now;

        if (user.Profile is null)
        {
            user.Profile = new server.Models.Profile
            {
                UserId = user.Id,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            };
        }
        else
        {
            user.Profile.FullName = displayName;
            user.Profile.AvatarUrl = avatarUrl ?? user.Profile.AvatarUrl;
            user.Profile.UpdatedAt = now;
        }
    }

    private static User CreateGoogleUser(string email, string? fullName, string? avatarUrl)
    {
        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var displayName = string.IsNullOrWhiteSpace(fullName) ? email : fullName.Trim();

        return new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword($"google:{Guid.NewGuid():N}"),
            Role = "USER",
            AvatarUrl = avatarUrl,
            FullName = displayName,
            AuthProvider = "google",
            IsEmailVerified = true,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            }
        };
    }

    private static void UpdateGoogleUser(User user, string? fullName, string? avatarUrl)
    {
        var now = DateTime.UtcNow;
        var displayName = string.IsNullOrWhiteSpace(fullName)
            ? user.FullName ?? user.Profile?.FullName ?? user.Email
            : fullName.Trim();

        user.AuthProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "google" : user.AuthProvider;
        user.FullName = displayName;
        user.AvatarUrl = avatarUrl ?? user.AvatarUrl;
        user.IsEmailVerified = true;
        user.UpdatedAt = now;

        if (user.Profile is null)
        {
            user.Profile = new server.Models.Profile
            {
                UserId = user.Id,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            };
        }
        else
        {
            user.Profile.FullName = displayName;
            user.Profile.AvatarUrl = avatarUrl ?? user.Profile.AvatarUrl;
            user.Profile.UpdatedAt = now;
        }
    }
}
