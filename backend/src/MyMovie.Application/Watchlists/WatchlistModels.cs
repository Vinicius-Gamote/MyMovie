using MyMovie.Application.Catalog;

namespace MyMovie.Application.Watchlists;

public sealed record WatchlistItem(MovieSummary Movie, DateTimeOffset AddedAt);

public sealed record WatchlistView(IReadOnlyList<WatchlistItem> Items);
