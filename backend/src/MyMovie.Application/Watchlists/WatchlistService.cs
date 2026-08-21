using MyMovie.Application.Catalog;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Watchlists;

namespace MyMovie.Application.Watchlists;

public sealed class WatchlistService(
    IWatchlistRepository repository,
    IMovieProvider movieProvider,
    TimeProvider timeProvider)
{
    public async Task<WatchlistView> GetAsync(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var watchlist = await repository.GetByOwnerAsync(ownerUserId, cancellationToken);
        if (watchlist is null || watchlist.Entries.Count == 0)
        {
            return new WatchlistView([]);
        }

        var detailTasks = watchlist.Entries.Select(async entry =>
        {
            try
            {
                var details = await movieProvider.GetDetailsAsync(entry.Movie.ProviderMovieId, cancellationToken);
                return details is null ? null : new WatchlistItem(ToSummary(details), entry.CreatedAt);
            }
            catch
            {
                return null;
            }
        });

        var results = await Task.WhenAll(detailTasks);
        return new WatchlistView(results.OfType<WatchlistItem>().OrderByDescending(item => item.AddedAt).ToArray());
    }

    public async Task<bool> AddAsync(Guid ownerUserId, int movieId, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        var watchlist = await repository.GetByOwnerAsync(ownerUserId, cancellationToken)
            ?? Watchlist.Create(ownerUserId, now);

        var added = watchlist.Add(new MovieReference("tmdb", movieId), now);
        if (added)
        {
            await repository.SaveAsync(watchlist, cancellationToken);
        }

        return added;
    }

    public async Task<bool> RemoveAsync(Guid ownerUserId, int movieId, CancellationToken cancellationToken)
    {
        var watchlist = await repository.GetByOwnerAsync(ownerUserId, cancellationToken);
        if (watchlist is null)
        {
            return false;
        }

        var removed = watchlist.Remove(new MovieReference("tmdb", movieId), timeProvider.GetUtcNow());
        if (removed)
        {
            await repository.SaveAsync(watchlist, cancellationToken);
        }

        return removed;
    }

    private static MovieSummary ToSummary(MovieDetails details) => new(
        details.Id,
        details.Title,
        details.Overview,
        details.ReleaseDate,
        details.ProviderRating,
        details.VoteCount,
        details.PosterUrl,
        details.BackdropUrl);
}
