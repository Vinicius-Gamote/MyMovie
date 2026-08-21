using Microsoft.EntityFrameworkCore;
using MyMovie.Application.Watchlists;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Watchlists;
using Npgsql;

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

    public async Task<bool> AddMovieAsync(
        Watchlist watchlist,
        MovieReference movie,
        CancellationToken cancellationToken)
    {
        const int maximumAttempts = 2;
        for (var attempt = 1; attempt <= maximumAttempts; attempt++)
        {
            dbContext.ChangeTracker.Clear();
            var entity = await dbContext.Watchlists
                .SingleOrDefaultAsync(item => item.OwnerUserId == watchlist.OwnerUserId, cancellationToken);

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
            else if (await dbContext.WatchlistEntries.AnyAsync(
                entry =>
                    entry.WatchlistId == entity.Id &&
                    entry.Provider == movie.Provider &&
                    entry.ProviderMovieId == movie.ProviderMovieId,
                cancellationToken))
            {
                return false;
            }

            entity.UpdatedAt = watchlist.UpdatedAt;
            dbContext.WatchlistEntries.Add(new WatchlistEntryEntity
            {
                Id = Guid.NewGuid(),
                WatchlistId = entity.Id,
                Provider = movie.Provider,
                ProviderMovieId = movie.ProviderMovieId,
                CreatedAt = watchlist.Entries.Single(entry => entry.Movie == movie).CreatedAt
            });

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }
            catch (DbUpdateException exception) when (IsUniqueViolation(exception) && attempt < maximumAttempts)
            {
                // Another request may have created the user's watchlist first.
                // Clear the failed graph and retry against the persisted parent.
            }
            catch (DbUpdateException exception) when (IsUniqueViolation(exception))
            {
                return false;
            }
        }

        return false;
    }

    public async Task<bool> RemoveMovieAsync(
        Watchlist watchlist,
        MovieReference movie,
        CancellationToken cancellationToken)
    {
        dbContext.ChangeTracker.Clear();
        var entity = await dbContext.Watchlists
            .SingleOrDefaultAsync(item => item.OwnerUserId == watchlist.OwnerUserId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        var entry = await dbContext.WatchlistEntries.SingleOrDefaultAsync(
            item =>
                item.WatchlistId == entity.Id &&
                item.Provider == movie.Provider &&
                item.ProviderMovieId == movie.ProviderMovieId,
            cancellationToken);
        if (entry is null)
        {
            return false;
        }

        dbContext.WatchlistEntries.Remove(entry);
        entity.UpdatedAt = watchlist.UpdatedAt;
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
