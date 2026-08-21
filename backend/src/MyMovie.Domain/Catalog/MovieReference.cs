using MyMovie.Domain.Common;

namespace MyMovie.Domain.Catalog;

public sealed record MovieReference
{
    public MovieReference(string provider, int providerMovieId)
    {
        if (string.IsNullOrWhiteSpace(provider))
        {
            throw new DomainException("A movie provider is required.");
        }

        if (providerMovieId <= 0)
        {
            throw new DomainException("A provider movie ID must be greater than zero.");
        }

        Provider = provider.Trim().ToLowerInvariant();
        ProviderMovieId = providerMovieId;
    }

    public string Provider { get; }

    public int ProviderMovieId { get; }
}
