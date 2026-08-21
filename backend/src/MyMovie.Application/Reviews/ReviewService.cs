using MyMovie.Application.Common;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Reviews;

namespace MyMovie.Application.Reviews;

public sealed class ReviewService(IReviewRepository repository, TimeProvider timeProvider)
{
    public Task<PagedResult<ReviewView>> ListForModerationAsync(
        ReviewStatus status,
        int page,
        CancellationToken cancellationToken)
    {
        if (page is < 1 or > 500)
        {
            throw new AppValidationException("Page must be between 1 and 500.");
        }

        return repository.ListForModerationAsync(status, page, 20, cancellationToken);
    }

    public Task<PagedResult<ReviewView>> ListAsync(int movieId, int page, CancellationToken cancellationToken)
    {
        if (page is < 1 or > 500)
        {
            throw new AppValidationException("Page must be between 1 and 500.");
        }

        return repository.ListPublishedAsync(new MovieReference("tmdb", movieId), page, 10, cancellationToken);
    }

    public async Task<ReviewView> CreateAsync(
        Guid authorUserId,
        int movieId,
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        var movie = new MovieReference("tmdb", movieId);
        if (await repository.ExistsActiveAsync(authorUserId, movie, cancellationToken))
        {
            throw new ConflictException("You have already reviewed this movie.");
        }

        var review = Review.Create(
            authorUserId,
            movie,
            new Rating(request.Rating),
            new ReviewText(request.Text),
            timeProvider.GetUtcNow());

        await repository.AddAsync(review, cancellationToken);
        var displayName = await repository.GetDisplayNameAsync(authorUserId, cancellationToken);
        return ToView(review, displayName);
    }

    public async Task<ReviewView> UpdateAsync(
        Guid actorUserId,
        Guid reviewId,
        UpdateReviewRequest request,
        CancellationToken cancellationToken)
    {
        var review = await GetReviewAsync(reviewId, cancellationToken);
        if (review.AuthorUserId != actorUserId)
        {
            throw new ForbiddenException("Only the review author can change this review.");
        }

        if (review.Version != request.Version)
        {
            throw new ConflictException("The review was changed by another request. Refresh and try again.");
        }

        review.Update(actorUserId, new Rating(request.Rating), new ReviewText(request.Text), request.Version, timeProvider.GetUtcNow());
        await repository.UpdateAsync(review, cancellationToken);
        return ToView(review, await repository.GetDisplayNameAsync(actorUserId, cancellationToken));
    }

    public async Task DeleteAsync(Guid actorUserId, Guid reviewId, int version, CancellationToken cancellationToken)
    {
        var review = await GetReviewAsync(reviewId, cancellationToken);
        if (review.AuthorUserId != actorUserId)
        {
            throw new ForbiddenException("Only the review author can delete this review.");
        }

        if (review.Version != version)
        {
            throw new ConflictException("The review was changed by another request. Refresh and try again.");
        }

        review.Delete(actorUserId, version, timeProvider.GetUtcNow());
        await repository.UpdateAsync(review, cancellationToken);
    }

    public Task HideAsync(Guid administratorUserId, Guid reviewId, string reason, CancellationToken cancellationToken) =>
        ModerateAsync(administratorUserId, reviewId, reason, restore: false, cancellationToken);

    public Task RestoreAsync(Guid administratorUserId, Guid reviewId, string reason, CancellationToken cancellationToken) =>
        ModerateAsync(administratorUserId, reviewId, reason, restore: true, cancellationToken);

    private async Task ModerateAsync(
        Guid administratorUserId,
        Guid reviewId,
        string reason,
        bool restore,
        CancellationToken cancellationToken)
    {
        var review = await GetReviewAsync(reviewId, cancellationToken);
        if (restore)
        {
            review.Restore(administratorUserId, reason, timeProvider.GetUtcNow());
        }
        else
        {
            review.Hide(administratorUserId, reason, timeProvider.GetUtcNow());
        }

        await repository.UpdateAsync(review, cancellationToken);
    }

    private async Task<Review> GetReviewAsync(Guid reviewId, CancellationToken cancellationToken) =>
        await repository.GetByIdAsync(reviewId, cancellationToken)
        ?? throw new NotFoundException("The requested review was not found.");

    private static ReviewView ToView(Review review, string displayName) => new(
        review.Id,
        review.AuthorUserId,
        displayName,
        review.Movie.ProviderMovieId,
        review.Rating.Value,
        review.Text.Value,
        review.Status,
        review.Version,
        review.CreatedAt,
        review.UpdatedAt);
}
