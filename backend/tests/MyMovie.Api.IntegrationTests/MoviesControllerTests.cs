using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using MyMovie.Application.Catalog;
using MyMovie.Application.Common;

namespace MyMovie.Api.IntegrationTests;

public sealed class MoviesControllerTests(MovieApiFactory factory) : IClassFixture<MovieApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false
    });

    [Fact]
    public async Task Latest_ReturnsTypedPagedResult()
    {
        var response = await _client.GetAsync("/api/v1/movies/latest?page=1");
        var result = await response.Content.ReadFromJsonAsync<PagedResult<MovieSummary>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.Equal("Fight Club", Assert.Single(result.Items).Title);
        Assert.True(response.Headers.Contains("X-Correlation-ID"));
    }

    [Fact]
    public async Task UnknownMovie_ReturnsProblemDetails()
    {
        var response = await _client.GetAsync("/api/v1/movies/404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task AntiforgeryEndpoint_IssuesReadableRequestTokenCookie()
    {
        var response = await _client.GetAsync("/api/v1/auth/csrf");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), value => value.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task InvalidPage_ReturnsValidationProblemDetails()
    {
        var response = await _client.GetAsync("/api/v1/movies/latest?page=0");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.Equal("validation_error", problem?["code"].ToString());
    }

    [Fact]
    public async Task PrivateWatchlist_RejectsAnonymousRequests()
    {
        var response = await _client.GetAsync("/api/v1/watchlist");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MutationWithoutAntiforgeryToken_IsRejected()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/sign-in", new
        {
            email = "member@example.com",
            password = "NotARealPassword!1",
            rememberMe = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
