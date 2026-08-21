using Microsoft.EntityFrameworkCore;
using MyMovie.Application.Common;
using MyMovie.Application.Reviews;
using MyMovie.Domain.Catalog;
using MyMovie.Domain.Reviews;

namespace MyMovie.Infrastructure.Persistence;

public sealed class ReviewRepository(AppDbContext dbContext) : IReviewRepository
{
    public async Task<PagedResult<ReviewView>> ListForModerationAsync(
        ReviewStatus status,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Reviews.AsNoTracking().Where(item => item.Status == status.ToString());
        var total = await query.LongCountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(item => item.UpdatedAt)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new ReviewView(
                item.Id,
                item.AuthorUserId,
                item.Author == null ? "Former member" : item.Author.DisplayName,
                item.ProviderMovieId,
                item.Rating,
                item.Text,
                Enum.Parse<ReviewStatus>(item.Status),
                item.Version,
                item.CreatedAt,
                item.UpdatedAt))
            .ToListAsync(cancellationToken);
        return new PagedResult<ReviewView>(items, page, pageSize, (int)Math.Ceiling(total / (double)pageSize), total);
    }

    public async Task<PagedResult<ReviewView>> ListPublishedAsync(
        MovieReference movie,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Reviews.AsNoTracking()
            .Where(item =>
                item.Provider == movie.Provider &&
                item.ProviderMovieId == movie.ProviderMovieId &&
                item.Status == nameof(ReviewStatus.Published));

        var total = await query.LongCountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new ReviewView(
                item.Id,
                item.AuthorUserId,
                item.Author == null ? "Former member" : item.Author.DisplayName,
                item.ProviderMovieId,
                item.Rating,
                item.Text,
                Enum.Parse<ReviewStatus>(item.Status),
                item.Version,
                item.CreatedAt,
                item.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<ReviewView>(items, page, pageSize, (int)Math.Ceiling(total / (double)pageSize), total);
    }

    public async Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Reviews.AsNoTracking()
            .Include(item => item.ModerationRecords)
            .SingleOrDefaultAsync(item => item.Id == reviewId, cancellationToken);
        return entity is null ? null : ToDomain(entity);
    }

    public Task<bool> ExistsActiveAsync(Guid authorUserId, MovieReference movie, CancellationToken cancellationToken) =>
        dbContext.Reviews.AnyAsync(item =>
            item.AuthorUserId == authorUserId &&
            item.Provider == movie.Provider &&
            item.ProviderMovieId == movie.ProviderMovieId &&
            item.Status != nameof(ReviewStatus.Deleted),
            cancellationToken);

    public async Task AddAsync(Review review, CancellationToken cancellationToken)
    {
        dbContext.Reviews.Add(ToEntity(review));
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            throw new ConflictException("You have already reviewed this movie.", exception);
        }
    }

    public async Task UpdateAsync(Review review, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Reviews
            .Include(item => item.ModerationRecords)
            .SingleOrDefaultAsync(item => item.Id == review.Id, cancellationToken)
            ?? throw new NotFoundException("The requested review was not found.");

        if (entity.Version != review.Version - 1)
        {
            throw new ConflictException("The review was changed by another request. Refresh and try again.");
        }

        dbContext.Entry(entity).Property(item => item.Version).OriginalValue = review.Version - 1;
        entity.Rating = review.Rating.Value;
        entity.Text = review.Text.Value;
        entity.Status = review.Status.ToString();
        entity.Version = review.Version;
        entity.UpdatedAt = review.UpdatedAt;

        var existingIds = entity.ModerationRecords.Select(item => item.Id).ToHashSet();
        foreach (var record in review.ModerationRecords.Where(item => !existingIds.Contains(item.Id)))
        {
            entity.ModerationRecords.Add(new ModerationRecordEntity
            {
                Id = record.Id,
                ReviewId = review.Id,
                AdministratorUserId = record.AdministratorUserId,
                Action = record.Action,
                Reason = record.Reason,
                CreatedAt = record.CreatedAt
            });
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new ConflictException("The review was changed by another request. Refresh and try again.", exception);
        }
    }

    public async Task<string> GetDisplayNameAsync(Guid userId, CancellationToken cancellationToken) =>
        await dbContext.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.DisplayName)
            .SingleOrDefaultAsync(cancellationToken)
        ?? "Member";

    private static Review ToDomain(ReviewEntity entity) => Review.Rehydrate(
        entity.Id,
        entity.AuthorUserId,
        new MovieReference(entity.Provider, entity.ProviderMovieId),
        new Rating(entity.Rating),
        new ReviewText(entity.Text),
        Enum.Parse<ReviewStatus>(entity.Status),
        entity.Version,
        entity.CreatedAt,
        entity.UpdatedAt,
        entity.ModerationRecords.Select(item => new ModerationRecord(
            item.Id,
            item.AdministratorUserId,
            item.Action,
            item.Reason,
            item.CreatedAt)));

    private static ReviewEntity ToEntity(Review review) => new()
    {
        Id = review.Id,
        AuthorUserId = review.AuthorUserId,
        Provider = review.Movie.Provider,
        ProviderMovieId = review.Movie.ProviderMovieId,
        Rating = review.Rating.Value,
        Text = review.Text.Value,
        Status = review.Status.ToString(),
        Version = review.Version,
        CreatedAt = review.CreatedAt,
        UpdatedAt = review.UpdatedAt
    };
}
