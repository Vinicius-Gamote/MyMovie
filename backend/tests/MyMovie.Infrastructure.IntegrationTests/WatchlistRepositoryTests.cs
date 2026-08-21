using Microsoft.EntityFrameworkCore;
using MyMovie.Domain.Catalog;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Infrastructure.IntegrationTests;

public sealed class WatchlistRepositoryTests
{
    [Fact]
    public async Task AddMovieAsync_InsertsEveryNewMovieIntoAnExistingWatchlist()
    {
        var ownerUserId = Guid.NewGuid();
        var watchlistId = Guid.NewGuid();
        var now = DateTimeOffset.Parse("2026-08-21T12:00:00Z");
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"watchlist-{Guid.NewGuid()}")
            .Options;

        await using var context = new AppDbContext(options);
        context.Watchlists.Add(new WatchlistEntity
        {
            Id = watchlistId,
            OwnerUserId = ownerUserId,
            CreatedAt = now,
            UpdatedAt = now
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WatchlistRepository(context);
        var watchlist = Assert.IsType<MyMovie.Domain.Watchlists.Watchlist>(
            await repository.GetByOwnerAsync(ownerUserId, CancellationToken.None));

        var firstMovie = new MovieReference("tmdb", 1329016);
        Assert.True(watchlist.Add(firstMovie, now.AddMinutes(1)));
        Assert.True(await repository.AddMovieAsync(watchlist, firstMovie, CancellationToken.None));
        context.ChangeTracker.Clear();

        watchlist = Assert.IsType<MyMovie.Domain.Watchlists.Watchlist>(
            await repository.GetByOwnerAsync(ownerUserId, CancellationToken.None));
        var secondMovie = new MovieReference("tmdb", 550);
        Assert.True(watchlist.Add(secondMovie, now.AddMinutes(2)));
        Assert.True(await repository.AddMovieAsync(watchlist, secondMovie, CancellationToken.None));

        var movieIds = await context.WatchlistEntries
            .AsNoTracking()
            .OrderBy(entry => entry.ProviderMovieId)
            .Select(entry => entry.ProviderMovieId)
            .ToArrayAsync();

        Assert.Equal([550, 1329016], movieIds);
    }
}
