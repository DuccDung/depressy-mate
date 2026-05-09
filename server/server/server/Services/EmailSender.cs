using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;

namespace server.Services;

public sealed class EmailOptions
{
    public string FromName { get; set; } = "Depressy Mate";

    public string FromAddress { get; set; } = string.Empty;
}

public sealed class SupportOptions
{
    public string InboxAddress { get; set; } = string.Empty;
}

public sealed class SmtpOptions
{
    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    public bool UseStartTls { get; set; } = true;

    public string User { get; set; } = string.Empty;

    public string Pass { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 30;
}

public sealed class EmailSender
{
    private readonly EmailOptions _emailOptions;
    private readonly SupportOptions _supportOptions;
    private readonly SmtpOptions _smtpOptions;

    public EmailSender(
        IOptions<EmailOptions> emailOptions,
        IOptions<SupportOptions> supportOptions,
        IOptions<SmtpOptions> smtpOptions)
    {
        _emailOptions = emailOptions.Value;
        _supportOptions = supportOptions.Value;
        _smtpOptions = smtpOptions.Value;
    }

    public Task SendRegistrationOtpAsync(string toAddress, string otp, CancellationToken cancellationToken = default)
    {
        var subject = "Ma OTP dang ky Depressy Mate";
        var encodedOtp = WebUtility.HtmlEncode(otp);
        var body = $"""
            <!doctype html>
            <html>
            <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
                <h2 style="color:#7B61FF">Depressy Mate</h2>
                <p>Ban dang tao tai khoan Depressy Mate. Vui long nhap ma OTP ben duoi de hoan tat dang ky:</p>
                <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#111827">{encodedOtp}</p>
                <p>Ma nay co hieu luc trong 10 phut. Neu ban khong yeu cau dang ky, hay bo qua email nay.</p>
            </body>
            </html>
            """;

        return SendAsync(toAddress, subject, body, cancellationToken);
    }

    private async Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_smtpOptions.Host) ||
            string.IsNullOrWhiteSpace(_smtpOptions.User) ||
            string.IsNullOrWhiteSpace(_smtpOptions.Pass) ||
            string.IsNullOrWhiteSpace(_emailOptions.FromAddress))
        {
            throw new InvalidOperationException("SMTP email configuration is missing.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_emailOptions.FromAddress, _emailOptions.FromName, Encoding.UTF8),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8
        };

        message.To.Add(new MailAddress(toAddress));
        if (!string.IsNullOrWhiteSpace(_supportOptions.InboxAddress))
        {
            message.ReplyToList.Add(new MailAddress(_supportOptions.InboxAddress));
        }

        using var smtpClient = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            EnableSsl = _smtpOptions.UseStartTls,
            Credentials = new NetworkCredential(_smtpOptions.User, _smtpOptions.Pass),
            Timeout = Math.Max(1, _smtpOptions.TimeoutSeconds) * 1000
        };

        await smtpClient.SendMailAsync(message, cancellationToken);
    }
}
