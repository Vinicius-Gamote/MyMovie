using MyMovie.Domain.Common;

namespace MyMovie.Domain.Reviews;

public readonly record struct Rating
{
    public Rating(int value)
    {
        if (value is < 1 or > 10)
        {
            throw new DomainException("A review rating must be between 1 and 10.");
        }

        Value = value;
    }

    public int Value { get; }
}
