namespace MyMovie.Infrastructure.Persistence;

public sealed class WatchlistEntity
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<WatchlistEntryEntity> Entries { get; set; } = [];
}

public sealed class WatchlistEntryEntity
{
    public Guid Id { get; set; }
    public Guid WatchlistId { get; set; }
    public required string Provider { get; set; }
    public int ProviderMovieId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public WatchlistEntity? Watchlist { get; set; }
}

public sealed class ReviewEntity
{
    public Guid Id { get; set; }
    public Guid AuthorUserId { get; set; }
    public required string Provider { get; set; }
    public int ProviderMovieId { get; set; }
    public int Rating { get; set; }
    public required string Text { get; set; }
    public required string Status { get; set; }
    public int Version { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ApplicationUser? Author { get; set; }
    public List<ModerationRecordEntity> ModerationRecords { get; set; } = [];
}

public sealed class ModerationRecordEntity
{
    public Guid Id { get; set; }
    public Guid ReviewId { get; set; }
    public Guid AdministratorUserId { get; set; }
    public required string Action { get; set; }
    public required string Reason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ReviewEntity? Review { get; set; }
}

public sealed class MovieSnapshotEntity
{
    public required string Provider { get; set; }
    public int ProviderMovieId { get; set; }
    public required string PayloadJson { get; set; }
    public DateTimeOffset FetchedAt { get; set; }
    public DateTimeOffset FreshUntil { get; set; }
    public DateTimeOffset ServeUntil { get; set; }
}
