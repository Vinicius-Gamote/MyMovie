using MyMovie.Domain.Common;

namespace MyMovie.Domain.Reviews;

public sealed record ReviewText
{
    public ReviewText(string value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length is < 50 or > 2000)
        {
            throw new DomainException("Review text must contain between 50 and 2,000 characters.");
        }

        Value = normalized;
    }

    public string Value { get; }
}
