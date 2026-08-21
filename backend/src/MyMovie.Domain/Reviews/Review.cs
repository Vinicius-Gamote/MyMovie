using MyMovie.Domain.Catalog;
using MyMovie.Domain.Common;

namespace MyMovie.Domain.Reviews;

public sealed class Review
{
    private readonly List<ModerationRecord> _moderationRecords;

    private Review(
        Guid id,
        Guid authorUserId,
        MovieReference movie,
        Rating rating,
        ReviewText text,
        ReviewStatus status,
        int version,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt,
        IEnumerable<ModerationRecord>? moderationRecords = null)
    {
        if (id == Guid.Empty || authorUserId == Guid.Empty)
        {
            throw new DomainException("A review requires valid identifiers.");
        }

        Id = id;
        AuthorUserId = authorUserId;
        Movie = movie;
        Rating = rating;
        Text = text;
        Status = status;
        Version = version;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
        _moderationRecords = moderationRecords?.ToList() ?? [];
    }

    public Guid Id { get; }
    public Guid AuthorUserId { get; }
    public MovieReference Movie { get; }
    public Rating Rating { get; private set; }
    public ReviewText Text { get; private set; }
    public ReviewStatus Status { get; private set; }
    public int Version { get; private set; }
    public DateTimeOffset CreatedAt { get; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public IReadOnlyCollection<ModerationRecord> ModerationRecords => _moderationRecords.AsReadOnly();

    public static Review Create(
        Guid authorUserId,
        MovieReference movie,
        Rating rating,
        ReviewText text,
        DateTimeOffset now) =>
        new(Guid.NewGuid(), authorUserId, movie, rating, text, ReviewStatus.Published, 1, now, now);

    public static Review Rehydrate(
        Guid id,
        Guid authorUserId,
        MovieReference movie,
        Rating rating,
        ReviewText text,
        ReviewStatus status,
        int version,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt,
        IEnumerable<ModerationRecord>? moderationRecords = null) =>
        new(id, authorUserId, movie, rating, text, status, version, createdAt, updatedAt, moderationRecords);

    public void Update(Guid actorUserId, Rating rating, ReviewText text, int expectedVersion, DateTimeOffset now)
    {
        EnsureOwner(actorUserId);
        EnsureVersion(expectedVersion);
        EnsureActive();
        Rating = rating;
        Text = text;
        Version++;
        UpdatedAt = now;
    }

    public void Delete(Guid actorUserId, int expectedVersion, DateTimeOffset now)
    {
        EnsureOwner(actorUserId);
        EnsureVersion(expectedVersion);
        EnsureActive();
        Status = ReviewStatus.Deleted;
        Version++;
        UpdatedAt = now;
    }

    public void Hide(Guid administratorUserId, string reason, DateTimeOffset now)
    {
        EnsureModerationInput(administratorUserId, reason);
        if (Status == ReviewStatus.Deleted)
        {
            throw new DomainException("A deleted review cannot be moderated.");
        }

        Status = ReviewStatus.Hidden;
        Version++;
        UpdatedAt = now;
        _moderationRecords.Add(new ModerationRecord(Guid.NewGuid(), administratorUserId, "Hidden", reason.Trim(), now));
    }

    public void Restore(Guid administratorUserId, string reason, DateTimeOffset now)
    {
        EnsureModerationInput(administratorUserId, reason);
        if (Status != ReviewStatus.Hidden)
        {
            throw new DomainException("Only a hidden review can be restored.");
        }

        Status = ReviewStatus.Published;
        Version++;
        UpdatedAt = now;
        _moderationRecords.Add(new ModerationRecord(Guid.NewGuid(), administratorUserId, "Restored", reason.Trim(), now));
    }

    private static void EnsureModerationInput(Guid administratorUserId, string reason)
    {
        if (administratorUserId == Guid.Empty || string.IsNullOrWhiteSpace(reason))
        {
            throw new DomainException("Moderation requires an administrator and a reason.");
        }
    }

    private void EnsureOwner(Guid actorUserId)
    {
        if (actorUserId != AuthorUserId)
        {
            throw new DomainException("Only the review author can change this review.");
        }
    }

    private void EnsureVersion(int expectedVersion)
    {
        if (Version != expectedVersion)
        {
            throw new DomainException("The review was changed by another request.");
        }
    }

    private void EnsureActive()
    {
        if (Status == ReviewStatus.Deleted)
        {
            throw new DomainException("A deleted review cannot be changed.");
        }
    }
}
