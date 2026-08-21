using MyMovie.Application.Catalog;
using MyMovie.Application.Common;

namespace MyMovie.Application.Tests;

public sealed class CatalogServiceTests
{
    [Fact]
    public async Task Search_DoesNotCallProviderForBlankInput()
    {
        var provider = new FakeMovieProvider();
        var service = new CatalogService(provider);

        var result = await service.SearchAsync("   ", 1, CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.Equal(0, provider.SearchCalls);
    }

    [Fact]
    public async Task Details_MapsMissingMovieToNotFound()
    {
        var service = new CatalogService(new FakeMovieProvider());

        await Assert.ThrowsAsync<NotFoundException>(() => service.GetDetailsAsync(404, CancellationToken.None));
    }

    private sealed class FakeMovieProvider : IMovieProvider
    {
        public int SearchCalls { get; private set; }

        public Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken) =>
            Task.FromResult(new PagedResult<MovieSummary>([], page, 20, 0, 0));

        public Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken)
        {
            SearchCalls++;
            return Task.FromResult(new PagedResult<MovieSummary>([], page, 20, 0, 0));
        }

        public Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken) =>
            Task.FromResult<MovieDetails?>(null);
    }
}
