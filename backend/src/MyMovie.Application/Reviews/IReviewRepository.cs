using MyMovie.Application.Common;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Reviews;

namespace MyMovie.Application.Reviews;

public interface IReviewRepository
{
    Task<PagedResult<ReviewView>> ListPublishedAsync(MovieReference movie, int page, int pageSize, CancellationToken cancellationToken);

    Task<PagedResult<ReviewView>> ListForModerationAsync(ReviewStatus status, int page, int pageSize, CancellationToken cancellationToken);

    Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken);

    Task<bool> ExistsActiveAsync(Guid authorUserId, MovieReference movie, CancellationToken cancellationToken);

    Task AddAsync(Review review, CancellationToken cancellationToken);

    Task UpdateAsync(Review review, CancellationToken cancellationToken);

    Task<string> GetDisplayNameAsync(Guid userId, CancellationToken cancellationToken);
}
