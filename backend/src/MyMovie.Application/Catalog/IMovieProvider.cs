using MyMovie.Application.Common;

namespace MyMovie.Application.Catalog;

public interface IMovieProvider
{
    Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken);

    Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken);

    Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken);
}
