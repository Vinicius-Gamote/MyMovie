using System.Diagnostics;

namespace MyMovie.Api.Middleware;

public sealed class CorrelationMiddleware(RequestDelegate next)
{
    private const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var supplied) &&
                            Guid.TryParse(supplied.FirstOrDefault(), out var parsed)
            ? parsed.ToString("D")
            : Guid.NewGuid().ToString("D");

        context.TraceIdentifier = correlationId;
        Activity.Current?.SetTag("correlation.id", correlationId);
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });
        await next(context);
    }
}
