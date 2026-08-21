using MyMovie.Domain.Catalog;

namespace MyMovie.Domain.Watchlists;

public sealed record WatchlistEntry(MovieReference Movie, DateTimeOffset CreatedAt);
