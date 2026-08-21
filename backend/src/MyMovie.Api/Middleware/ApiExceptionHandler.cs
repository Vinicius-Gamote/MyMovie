using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMovie.Application.Common;
using MyMovie.Domain.Common;

namespace MyMovie.Api.Middleware;

public sealed class ApiExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, code, title) = exception switch
        {
            AppValidationException => (StatusCodes.Status422UnprocessableEntity, "validation_error", "Validation failed"),
            DomainException => (StatusCodes.Status422UnprocessableEntity, "business_rule_violation", "Business rule violation"),
            NotFoundException => (StatusCodes.Status404NotFound, "not_found", "Resource not found"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "forbidden", "Access denied"),
            ConflictException or DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "conflict", "Conflict"),
            ProviderUnavailableException => (StatusCodes.Status503ServiceUnavailable, "provider_unavailable", "Movie provider unavailable"),
            OperationCanceledException => (499, "request_cancelled", "Request cancelled"),
            _ => (StatusCodes.Status500InternalServerError, "unexpected_error", "An unexpected error occurred")
        };

        if (status >= 500)
        {
            logger.LogError(exception, "Request failed with {ErrorCode}. Trace ID: {TraceId}", code, httpContext.TraceIdentifier);
        }
        else
        {
            logger.LogInformation("Request rejected with {ErrorCode}. Trace ID: {TraceId}", code, httpContext.TraceIdentifier);
        }

        httpContext.Response.StatusCode = status;
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = status >= 500 && exception is not ProviderUnavailableException
                ? "The request could not be completed."
                : exception.Message,
            Type = $"https://httpstatuses.com/{status}",
            Instance = httpContext.Request.Path
        };
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;
        if (exception is AppValidationException validationException && validationException.Errors.Count > 0)
        {
            problem.Extensions["errors"] = validationException.Errors;
        }

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }
}
