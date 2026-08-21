using MyMovie.Domain.Reviews;

namespace MyMovie.Application.Reviews;

public sealed record ReviewView(
    Guid Id,
    Guid AuthorUserId,
    string AuthorDisplayName,
    int MovieId,
    int Rating,
    string Text,
    ReviewStatus Status,
    int Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateReviewRequest(int Rating, string Text);

public sealed record UpdateReviewRequest(int Rating, string Text, int Version);

public sealed record ModerateReviewRequest(string Reason);
