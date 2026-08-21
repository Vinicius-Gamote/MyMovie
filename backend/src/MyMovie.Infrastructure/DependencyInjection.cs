using System.Net.Http.Headers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MyMovie.Application.Catalog;
using MyMovie.Application.Identity;
using MyMovie.Application.Reviews;
using MyMovie.Application.Watchlists;
using MyMovie.Infrastructure.Identity;
using MyMovie.Infrastructure.Movies;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");

        services.AddDbContext<AppDbContext>(options => options
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention());
        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 12;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<TmdbOptions>(configuration.GetSection(TmdbOptions.SectionName));
        services.AddMemoryCache();
        services.AddHttpClient<TmdbMovieProvider>((serviceProvider, client) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<TmdbOptions>>().Value;
                client.BaseAddress = new Uri(options.BaseUrl, UriKind.Absolute);
                client.Timeout = TimeSpan.FromSeconds(12);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (!string.IsNullOrWhiteSpace(options.AccessToken))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);
                }
            })
            .AddStandardResilienceHandler(options =>
            {
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(8);
                options.Retry.MaxRetryAttempts = 2;
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            });

        services.AddScoped<IMovieProvider, CachedMovieProvider>();
        services.AddScoped<IWatchlistRepository, WatchlistRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<DatabaseInitializer>();
        services.AddScoped<DatabaseHealthCheck>();
        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
