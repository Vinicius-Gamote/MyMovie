using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using MyMovie.Application.Catalog;
using MyMovie.Application.Common;

namespace MyMovie.Infrastructure.Movies;

public sealed class TmdbMovieProvider(HttpClient httpClient, IOptions<TmdbOptions> options) : IMovieProvider
{
    private readonly TmdbOptions _options = options.Value;

    public async Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var url = $"discover/movie?include_adult=false&include_video=false&language={Escape(_options.Language)}&page={page}&sort_by=primary_release_date.desc&primary_release_date.lte={today}&region={Escape(_options.Region)}&vote_count.gte=10";
        var response = await GetAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, cancellationToken)
            ?? throw new ProviderUnavailableException("TMDB returned an empty latest-movies response.");
        return MapPage(response);
    }

    public async Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var url = $"search/movie?include_adult=false&language={Escape(_options.Language)}&page={page}&query={Escape(query)}&region={Escape(_options.Region)}";
        var response = await GetAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, cancellationToken)
            ?? throw new ProviderUnavailableException("TMDB returned an empty search response.");
        return MapPage(response);
    }

    public async Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var url = $"movie/{movieId}?append_to_response=credits&language={Escape(_options.Language)}";
        var response = await httpClient.GetAsync(url, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        await EnsureSuccessAsync(response, cancellationToken);
        var movie = await response.Content.ReadFromJsonAsync<TmdbMovieDetails>(cancellationToken)
            ?? throw new ProviderUnavailableException("TMDB returned an empty movie-details response.");

        return new MovieDetails(
            movie.Id,
            movie.Title,
            EmptyToNull(movie.Tagline),
            EmptyToNull(movie.Overview),
            ParseDate(movie.ReleaseDate),
            movie.Runtime,
            movie.Genres.Select(genre => genre.Name).ToArray(),
            movie.VoteCount > 0 ? Math.Round(movie.VoteAverage, 1) : null,
            movie.VoteCount,
            ImageUrl(movie.PosterPath, "w500"),
            ImageUrl(movie.BackdropPath, "w1280"),
            (movie.Credits?.Cast ?? [])
                .OrderBy(member => member.Order)
                .Take(20)
                .Select(member => new CastMember(
                    member.Id,
                    member.Name,
                    EmptyToNull(member.Character) ?? "Unknown role",
                    ImageUrl(member.ProfilePath, "w185"),
                    member.Order))
                .ToArray());
    }

    private async Task<T?> GetAsync<T>(string url, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync(url, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var statusCode = (int)response.StatusCode;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var safeMessage = response.StatusCode == HttpStatusCode.TooManyRequests
            ? "The movie provider rate limit was reached. Please retry later."
            : $"The movie provider returned HTTP {statusCode}.";
        throw new ProviderUnavailableException(string.IsNullOrEmpty(body) ? safeMessage : safeMessage);
    }

    private PagedResult<MovieSummary> MapPage(TmdbPagedResponse<TmdbMovieSummary> response) => new(
        response.Results
            .OrderByDescending(movie => ParseDate(movie.ReleaseDate))
            .ThenBy(movie => movie.Id)
            .Select(MapSummary)
            .ToArray(),
        response.Page,
        response.Results.Count,
        Math.Min(response.TotalPages, 500),
        response.TotalResults);

    private MovieSummary MapSummary(TmdbMovieSummary movie) => new(
        movie.Id,
        movie.Title,
        EmptyToNull(movie.Overview),
        ParseDate(movie.ReleaseDate),
        movie.VoteCount > 0 ? Math.Round(movie.VoteAverage, 1) : null,
        movie.VoteCount,
        ImageUrl(movie.PosterPath, "w500"),
        ImageUrl(movie.BackdropPath, "w1280"));

    private string? ImageUrl(string? path, string size) =>
        string.IsNullOrWhiteSpace(path) ? null : $"{_options.ImageBaseUrl.TrimEnd('/')}/{size}{path}";

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;

    private static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Escape(string value) => Uri.EscapeDataString(value);

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.AccessToken))
        {
            throw new ProviderUnavailableException("TMDB is not configured. Set Tmdb__AccessToken in backend secret configuration.");
        }
    }
}
