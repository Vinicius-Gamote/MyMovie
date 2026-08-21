using MyMovie.Domain.Catalog;
using MyMovie.Domain.Common;

namespace MyMovie.Domain.Watchlists;

public sealed class Watchlist
{
    private readonly List<WatchlistEntry> _entries;

    private Watchlist(
        Guid id,
        Guid ownerUserId,
        IEnumerable<WatchlistEntry> entries,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt)
    {
        if (id == Guid.Empty || ownerUserId == Guid.Empty)
        {
            throw new DomainException("A watchlist requires valid identifiers.");
        }

        Id = id;
        OwnerUserId = ownerUserId;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
        _entries = entries.DistinctBy(entry => entry.Movie).ToList();
    }

    public Guid Id { get; }

    public Guid OwnerUserId { get; }

    public DateTimeOffset CreatedAt { get; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<WatchlistEntry> Entries => _entries.AsReadOnly();

    public static Watchlist Create(Guid ownerUserId, DateTimeOffset now) =>
        new(Guid.NewGuid(), ownerUserId, [], now, now);

    public static Watchlist Rehydrate(
        Guid id,
        Guid ownerUserId,
        IEnumerable<WatchlistEntry> entries,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt) =>
        new(id, ownerUserId, entries, createdAt, updatedAt);

    public bool Add(MovieReference movie, DateTimeOffset now)
    {
        if (_entries.Any(entry => entry.Movie == movie))
        {
            return false;
        }

        _entries.Add(new WatchlistEntry(movie, now));
        UpdatedAt = now;
        return true;
    }

    public bool Remove(MovieReference movie, DateTimeOffset now)
    {
        var entry = _entries.SingleOrDefault(item => item.Movie == movie);
        if (entry is null)
        {
            return false;
        }

        _entries.Remove(entry);
        UpdatedAt = now;
        return true;
    }
}
