namespace MyMovie.Application.Common;

public sealed class AppValidationException : Exception
{
    public AppValidationException(string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public AppValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public IReadOnlyDictionary<string, string[]> Errors { get; }
}

public sealed class NotFoundException(string message) : Exception(message);

public sealed class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message)
    {
    }

    public ConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

public sealed class ForbiddenException(string message) : Exception(message);

public sealed class ProviderUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
