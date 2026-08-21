using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MyMovie.Application.Catalog;
using MyMovie.Application.Common;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Infrastructure.Movies;

public sealed class CachedMovieProvider(
    TmdbMovieProvider inner,
    IMemoryCache memoryCache,
    AppDbContext dbContext,
    IOptions<TmdbOptions> options,
    TimeProvider timeProvider) : IMovieProvider
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> Locks = new();
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly TmdbOptions _options = options.Value;

    public Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken) =>
        GetOrCreateAsync($"catalog:latest:{page}", TimeSpan.FromMinutes(5),
            token => inner.GetLatestAsync(page, token), cancellationToken);

    public Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken) =>
        GetOrCreateAsync($"catalog:search:{query.ToLowerInvariant()}:{page}", TimeSpan.FromMinutes(3),
            token => inner.SearchAsync(query, page, token), cancellationToken);

    public async Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken)
    {
        var key = $"catalog:details:{movieId}";
        if (memoryCache.TryGetValue<MovieDetails>(key, out var cached))
        {
            return cached;
        }

        var gate = Locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (memoryCache.TryGetValue<MovieDetails>(key, out cached))
            {
                return cached;
            }

            var now = timeProvider.GetUtcNow();
            var snapshot = await dbContext.MovieSnapshots.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Provider == "tmdb" && item.ProviderMovieId == movieId, cancellationToken);
            if (snapshot is not null && snapshot.FreshUntil > now)
            {
                var fresh = JsonSerializer.Deserialize<MovieDetails>(snapshot.PayloadJson, JsonOptions);
                if (fresh is not null)
                {
                    memoryCache.Set(key, fresh, TimeSpan.FromMinutes(15));
                    return fresh;
                }
            }

            try
            {
                var result = await inner.GetDetailsAsync(movieId, cancellationToken);
                if (result is null)
                {
                    return null;
                }

                await StoreSnapshotAsync(result, now, cancellationToken);
                memoryCache.Set(key, result, TimeSpan.FromMinutes(30));
                return result;
            }
            catch (ProviderUnavailableException) when (snapshot is not null && snapshot.ServeUntil > now)
            {
                var stale = JsonSerializer.Deserialize<MovieDetails>(snapshot.PayloadJson, JsonOptions);
                if (stale is not null)
                {
                    memoryCache.Set(key, stale, TimeSpan.FromMinutes(5));
                    return stale;
                }

                throw;
            }
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<T> GetOrCreateAsync<T>(
        string key,
        TimeSpan duration,
        Func<CancellationToken, Task<T>> factory,
        CancellationToken cancellationToken)
    {
        if (memoryCache.TryGetValue<T>(key, out var cached) && cached is not null)
        {
            return cached;
        }

        var gate = Locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (memoryCache.TryGetValue<T>(key, out cached) && cached is not null)
            {
                return cached;
            }

            var value = await factory(cancellationToken);
            memoryCache.Set(key, value, duration);
            return value;
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task StoreSnapshotAsync(MovieDetails details, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.MovieSnapshots
            .SingleOrDefaultAsync(item => item.Provider == "tmdb" && item.ProviderMovieId == details.Id, cancellationToken);
        if (snapshot is null)
        {
            snapshot = new MovieSnapshotEntity { Provider = "tmdb", ProviderMovieId = details.Id, PayloadJson = string.Empty };
            dbContext.MovieSnapshots.Add(snapshot);
        }

        snapshot.PayloadJson = JsonSerializer.Serialize(details, JsonOptions);
        snapshot.FetchedAt = now;
        snapshot.FreshUntil = now.AddMinutes(_options.DetailsFreshMinutes);
        snapshot.ServeUntil = now.AddHours(_options.DetailsStaleHours);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
