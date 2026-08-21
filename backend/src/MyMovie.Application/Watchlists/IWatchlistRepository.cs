using MyMovie.Domain.Catalog;
using MyMovie.Domain.Watchlists;

namespace MyMovie.Application.Watchlists;

public interface IWatchlistRepository
{
    Task<Watchlist?> GetByOwnerAsync(Guid ownerUserId, CancellationToken cancellationToken);

    Task<bool> AddMovieAsync(
        Watchlist watchlist,
        MovieReference movie,
        CancellationToken cancellationToken);

    Task<bool> RemoveMovieAsync(
        Watchlist watchlist,
        MovieReference movie,
        CancellationToken cancellationToken);
}
