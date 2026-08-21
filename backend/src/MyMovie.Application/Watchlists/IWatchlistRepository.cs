using MyMovie.Domain.Watchlists;

namespace MyMovie.Application.Watchlists;

public interface IWatchlistRepository
{
    Task<Watchlist?> GetByOwnerAsync(Guid ownerUserId, CancellationToken cancellationToken);

    Task SaveAsync(Watchlist watchlist, CancellationToken cancellationToken);
}
