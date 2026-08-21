using System.Text.Json.Serialization;

namespace MyMovie.Infrastructure.Movies;

internal sealed record TmdbPagedResponse<T>(
    [property: JsonPropertyName("page")] int Page,
    [property: JsonPropertyName("results")] IReadOnlyList<T> Results,
    [property: JsonPropertyName("total_pages")] int TotalPages,
    [property: JsonPropertyName("total_results")] long TotalResults);

internal sealed record TmdbMovieSummary(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("overview")] string? Overview,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("vote_average")] double VoteAverage,
    [property: JsonPropertyName("vote_count")] int VoteCount,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath);

internal sealed record TmdbGenre(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name);

internal sealed record TmdbCastMember(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("character")] string? Character,
    [property: JsonPropertyName("profile_path")] string? ProfilePath,
    [property: JsonPropertyName("order")] int Order);

internal sealed record TmdbCredits(
    [property: JsonPropertyName("cast")] IReadOnlyList<TmdbCastMember> Cast);

internal sealed record TmdbMovieDetails(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("tagline")] string? Tagline,
    [property: JsonPropertyName("overview")] string? Overview,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("runtime")] int? Runtime,
    [property: JsonPropertyName("genres")] IReadOnlyList<TmdbGenre> Genres,
    [property: JsonPropertyName("vote_average")] double VoteAverage,
    [property: JsonPropertyName("vote_count")] int VoteCount,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath,
    [property: JsonPropertyName("credits")] TmdbCredits? Credits);
