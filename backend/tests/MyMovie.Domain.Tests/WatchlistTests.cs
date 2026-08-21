using MyMovie.Domain.Catalog;
using MyMovie.Domain.Watchlists;

namespace MyMovie.Domain.Tests;

public sealed class WatchlistTests
{
    [Fact]
    public void Add_IsIdempotentForTheSameProviderMovie()
    {
        var now = DateTimeOffset.Parse("2026-08-19T12:00:00Z");
        var watchlist = Watchlist.Create(Guid.NewGuid(), now);
        var movie = new MovieReference("TMDB", 550);

        Assert.True(watchlist.Add(movie, now));
        Assert.False(watchlist.Add(new MovieReference("tmdb", 550), now.AddMinutes(1)));
        Assert.Single(watchlist.Entries);
    }

    [Fact]
    public void Remove_ReturnsFalseWhenMovieIsAbsent()
    {
        var now = DateTimeOffset.Parse("2026-08-19T12:00:00Z");
        var watchlist = Watchlist.Create(Guid.NewGuid(), now);

        Assert.False(watchlist.Remove(new MovieReference("tmdb", 550), now));
    }
}
