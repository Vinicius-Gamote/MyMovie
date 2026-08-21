using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using MyMovie.Application.Catalog;
using MyMovie.Application.Common;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Api.IntegrationTests;

public sealed class MovieApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Debug);
        });
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = "Host=localhost;Database=tests;Username=test;Password=test",
                ["Database:Initialize"] = "false",
                ["Database:ApplyMigrations"] = "false"
            }));
        builder.ConfigureServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase($"api-tests-{Guid.NewGuid()}"));
            services.RemoveAll<IMovieProvider>();
            services.AddScoped<IMovieProvider, StubMovieProvider>();
        });
    }

    private sealed class StubMovieProvider : IMovieProvider
    {
        private static readonly MovieSummary Summary = new(
            550,
            "Fight Club",
            "An insomniac meets a soap maker.",
            new DateOnly(1999, 10, 15),
            8.4,
            30000,
            null,
            null);

        public Task<PagedResult<MovieSummary>> GetLatestAsync(int page, CancellationToken cancellationToken) =>
            Task.FromResult(new PagedResult<MovieSummary>([Summary], page, 20, 1, 1));

        public Task<PagedResult<MovieSummary>> SearchAsync(string query, int page, CancellationToken cancellationToken) =>
            Task.FromResult(new PagedResult<MovieSummary>([Summary], page, 20, 1, 1));

        public Task<MovieDetails?> GetDetailsAsync(int movieId, CancellationToken cancellationToken) =>
            Task.FromResult<MovieDetails?>(movieId == 550
                ? new MovieDetails(
                    Summary.Id,
                    Summary.Title,
                    null,
                    Summary.Overview,
                    Summary.ReleaseDate,
                    139,
                    ["Drama"],
                    Summary.ProviderRating,
                    Summary.VoteCount,
                    null,
                    null,
                    [])
                : null);
    }
}
