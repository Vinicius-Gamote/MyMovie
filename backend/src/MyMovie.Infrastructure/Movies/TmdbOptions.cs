namespace MyMovie.Infrastructure.Movies;

public sealed class TmdbOptions
{
    public const string SectionName = "Tmdb";

    public string BaseUrl { get; init; } = "https://api.themoviedb.org/3/";
    public string ImageBaseUrl { get; init; } = "https://image.tmdb.org/t/p/";
    public string AccessToken { get; init; } = string.Empty;
    public string Language { get; init; } = "en-US";
    public string Region { get; init; } = "US";
    public int DetailsFreshMinutes { get; init; } = 360;
    public int DetailsStaleHours { get; init; } = 168;
}
