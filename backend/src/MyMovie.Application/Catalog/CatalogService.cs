using MyMovie.Application.Common;

namespace MyMovie.Application.Catalog;

public sealed class CatalogService(IMovieProvider movieProvider)
{
    public Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken)
    {
        ValidatePage(page);
        return movieProvider.GetLatestAsync(page, cancellationToken);
    }

    public Task<PagedResult<MovieSummary>> SearchAsync(string? query, int page, CancellationToken cancellationToken)
    {
        ValidatePage(page);
        var normalized = query?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
        {
            return Task.FromResult(new PagedResult<MovieSummary>([], page, 20, 0, 0));
        }

        if (normalized.Length > 120)
        {
            throw new AppValidationException(new Dictionary<string, string[]>
            {
                ["query"] = ["The search query cannot exceed 120 characters."]
            });
        }

        return movieProvider.SearchAsync(normalized, page, cancellationToken);
    }

    public async Task<MovieDetails> GetDetailsAsync(int movieId, CancellationToken cancellationToken)
    {
        if (movieId <= 0)
        {
            throw new AppValidationException(new Dictionary<string, string[]>
            {
                ["movieId"] = ["The movie ID must be greater than zero."]
            });
        }

        return await movieProvider.GetDetailsAsync(movieId, cancellationToken)
            ?? throw new NotFoundException("The requested movie was not found.");
    }

    private static void ValidatePage(int page)
    {
        if (page is < 1 or > 500)
        {
            throw new AppValidationException(new Dictionary<string, string[]>
            {
                ["page"] = ["Page must be between 1 and 500."]
            });
        }
    }
}
