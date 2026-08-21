using MyMovie.Application.Catalog;
using MyMovie.Application.Common;
using MyMovie.Application.Reviews;
using MyMovie.Application.Watchlists;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Reviews;
using MyMovie.Domain.Watchlists;

namespace MyMovie.Application.Tests;

public sealed class MemberWorkflowTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-08-19T12:00:00Z");
    private const string ReviewText = "A visually confident movie with excellent performances and a carefully earned conclusion.";

    [Fact]
    public async Task Watchlist_AddRemainsIdempotentAcrossRequests()
    {
        var repository = new FakeWatchlistRepository();
        var service = new WatchlistService(repository, new FakeMovieProvider(), new FixedTimeProvider(Now));
        var userId = Guid.NewGuid();

        Assert.True(await service.AddAsync(userId, 550, CancellationToken.None));
        Assert.False(await service.AddAsync(userId, 550, CancellationToken.None));
        Assert.Single(repository.Watchlist!.Entries);
    }

    [Fact]
    public async Task Watchlist_AllowsManyDistinctMovies()
    {
        var repository = new FakeWatchlistRepository();
        var service = new WatchlistService(repository, new FakeMovieProvider(), new FixedTimeProvider(Now));
        var userId = Guid.NewGuid();

        foreach (var movieId in Enumerable.Range(1, 100))
        {
            Assert.True(await service.AddAsync(userId, movieId, CancellationToken.None));
        }

        Assert.Equal(100, repository.Watchlist!.Entries.Count);
    }

    [Fact]
    public async Task Review_CreateRejectsDuplicateAuthorAndMovie()
    {
        var repository = new FakeReviewRepository();
        var service = new ReviewService(repository, new FixedTimeProvider(Now));
        var userId = Guid.NewGuid();

        await service.CreateAsync(userId, 550, new CreateReviewRequest(8, ReviewText), CancellationToken.None);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateAsync(userId, 550, new CreateReviewRequest(9, ReviewText), CancellationToken.None));
    }

    [Fact]
    public async Task Review_UpdateRejectsAnotherMember()
    {
        var repository = new FakeReviewRepository();
        var service = new ReviewService(repository, new FixedTimeProvider(Now));
        var created = await service.CreateAsync(
            Guid.NewGuid(),
            550,
            new CreateReviewRequest(8, ReviewText),
            CancellationToken.None);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateAsync(
            Guid.NewGuid(),
            created.Id,
            new UpdateReviewRequest(9, ReviewText, created.Version),
            CancellationToken.None));
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class FakeWatchlistRepository : IWatchlistRepository
    {
        public Watchlist? Watchlist { get; private set; }
        public Task<Watchlist?> GetByOwnerAsync(Guid ownerUserId, CancellationToken cancellationToken) => Task.FromResult(Watchlist);
        public Task<bool> AddMovieAsync(Watchlist watchlist, MovieReference movie, CancellationToken cancellationToken)
        {
            Watchlist = watchlist;
            return Task.FromResult(true);
        }
        public Task<bool> RemoveMovieAsync(Watchlist watchlist, MovieReference movie, CancellationToken cancellationToken)
        {
            Watchlist = watchlist;
            return Task.FromResult(true);
        }
    }

    private sealed class FakeMovieProvider : IMovieProvider
    {
        public Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken) => Task.FromResult(new PagedResult<MovieSummary>([], page, 20, 0, 0));
        public Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken) => Task.FromResult(new PagedResult<MovieSummary>([], page, 20, 0, 0));
        public Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken) => Task.FromResult<MovieDetails?>(null);
    }

    private sealed class FakeReviewRepository : IReviewRepository
    {
        private readonly List<Review> _reviews = [];
        public Task<PagedResult<ReviewView>> ListPublishedAsync(MovieReference movie, int page, int pageSize, CancellationToken cancellationToken) => Task.FromResult(new PagedResult<ReviewView>([], page, pageSize, 0, 0));
        public Task<PagedResult<ReviewView>> ListForModerationAsync(ReviewStatus status, int page, int pageSize, CancellationToken cancellationToken) => Task.FromResult(new PagedResult<ReviewView>([], page, pageSize, 0, 0));
        public Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken) => Task.FromResult(_reviews.SingleOrDefault(review => review.Id == reviewId));
        public Task<bool> ExistsActiveAsync(Guid authorUserId, MovieReference movie, CancellationToken cancellationToken) => Task.FromResult(_reviews.Any(review => review.AuthorUserId == authorUserId && review.Movie == movie && review.Status != ReviewStatus.Deleted));
        public Task AddAsync(Review review, CancellationToken cancellationToken) { _reviews.Add(review); return Task.CompletedTask; }
        public Task UpdateAsync(Review review, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> GetDisplayNameAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult("Movie fan");
    }
}
