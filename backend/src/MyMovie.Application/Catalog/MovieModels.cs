namespace MyMovie.Application.Catalog;

public sealed record MovieSummary(
    int Id,
    string Title,
    string? Overview,
    DateOnly? ReleaseDate,
    double? ProviderRating,
    int VoteCount,
    string? PosterUrl,
    string? BackdropUrl);

public sealed record CastMember(
    int Id,
    string Name,
    string Character,
    string? ProfileUrl,
    int Order);

public sealed record MovieDetails(
    int Id,
    string Title,
    string? Tagline,
    string? Overview,
    DateOnly? ReleaseDate,
    int? RuntimeMinutes,
    IReadOnlyList<string> Genres,
    double? ProviderRating,
    int VoteCount,
    string? PosterUrl,
    string? BackdropUrl,
    IReadOnlyList<CastMember> Cast);
