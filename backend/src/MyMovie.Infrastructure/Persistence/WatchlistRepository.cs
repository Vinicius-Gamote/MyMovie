using Microsoft.EntityFrameworkCore;
using MyMovie.Application.Watchlists;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Watchlists;

namespace MyMovie.Infrastructure.Persistence;

public sealed class WatchlistRepository(AppDbContext dbContext) : IWatchlistRepository
{
    public async Task<Watchlist?> GetByOwnerAsync(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Watchlists
            .AsNoTracking()
            .Include(item => item.Entries)
            .SingleOrDefaultAsync(item => item.OwnerUserId == ownerUserId, cancellationToken);

        return entity is null
            ? null
            : Watchlist.Rehydrate(
                entity.Id,
                entity.OwnerUserId,
                entity.Entries.Select(entry => new WatchlistEntry(
                    new MovieReference(entry.Provider, entry.ProviderMovieId),
                    entry.CreatedAt)),
                entity.CreatedAt,
                entity.UpdatedAt);
    }

    public async Task SaveAsync(Watchlist watchlist, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Watchlists
            .Include(item => item.Entries)
            .SingleOrDefaultAsync(item => item.Id == watchlist.Id, cancellationToken);

        if (entity is null)
        {
            entity = new WatchlistEntity
            {
                Id = watchlist.Id,
                OwnerUserId = watchlist.OwnerUserId,
                CreatedAt = watchlist.CreatedAt,
                UpdatedAt = watchlist.UpdatedAt
            };
            dbContext.Watchlists.Add(entity);
        }

        entity.UpdatedAt = watchlist.UpdatedAt;
        var desired = watchlist.Entries.ToDictionary(entry => entry.Movie);
        entity.Entries.RemoveAll(entry => !desired.ContainsKey(new MovieReference(entry.Provider, entry.ProviderMovieId)));

        foreach (var entry in watchlist.Entries)
        {
            if (entity.Entries.Any(item => item.Provider == entry.Movie.Provider && item.ProviderMovieId == entry.Movie.ProviderMovieId))
            {
                continue;
            }

            entity.Entries.Add(new WatchlistEntryEntity
            {
                Id = Guid.NewGuid(),
                WatchlistId = watchlist.Id,
                Provider = entry.Movie.Provider,
                ProviderMovieId = entry.Movie.ProviderMovieId,
                CreatedAt = entry.CreatedAt
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
