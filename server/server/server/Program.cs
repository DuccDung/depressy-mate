using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using server.Models;
using server.Services;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<DepressyMateContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DepressyMate")
    ));
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddMemoryCache();
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<SupportOptions>(builder.Configuration.GetSection("Support"));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<EmailSender>();
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = "Facebook";
    })
    .AddCookie(options =>
    {
        options.Cookie.Name = "depressy_mate_external_auth";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.LoginPath = "/Auth/Login";
        options.AccessDeniedPath = "/Auth/Login";
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;
    })
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Authentication:Google:client_id"]!;
        options.ClientSecret = builder.Configuration["Authentication:Google:client_secret"]!;
        options.CallbackPath = "/google/redirect";
        options.SaveTokens = true;
        options.Scope.Clear();
        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.Events.OnCreatingTicket = context =>
        {
            if (context.User.TryGetProperty("picture", out var picture))
            {
                var avatarUrl = picture.GetString();
                if (!string.IsNullOrWhiteSpace(avatarUrl))
                {
                    context.Identity?.AddClaim(new Claim("urn:google:picture", avatarUrl));
                }
            }

            return Task.CompletedTask;
        };
    })
    .AddFacebook(options =>
    {
        options.AppId = builder.Configuration["Authentication:Facebook:AppId"]!;
        options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"]!;
        options.CallbackPath = builder.Configuration["Authentication:Facebook:CallbackPath"] ?? "/facebook/redirect";
        options.SaveTokens = true;
        options.Scope.Clear();
        options.Scope.Add("public_profile");
        options.Fields.Add("name");
        options.Fields.Add("picture");
        options.Events.OnCreatingTicket = context =>
        {
            if (context.User.TryGetProperty("picture", out var picture) &&
                picture.TryGetProperty("data", out var data) &&
                data.TryGetProperty("url", out var url))
            {
                var avatarUrl = url.GetString();
                if (!string.IsNullOrWhiteSpace(avatarUrl))
                {
                    context.Identity?.AddClaim(new Claim("urn:facebook:picture", avatarUrl));
                }
            }

            return Task.CompletedTask;
        };
    });
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedHost |
        ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
// Add services to the container.
builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseRouting();

app.UseCors("FrontendCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
