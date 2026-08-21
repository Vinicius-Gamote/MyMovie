namespace MyMovie.Application.Common;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalPages,
    long TotalResults)
{
    public bool HasNextPage => Page < TotalPages;
}
