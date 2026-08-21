using Microsoft.EntityFrameworkCore;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Infrastructure.IntegrationTests;

public sealed class DatabaseModelTests
{
    [Fact]
    public void PostgreSqlModelContainsBusinessConstraints()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model_validation;Username=test;Password=test")
            .Options;
        using var context = new AppDbContext(options);

        var script = context.Database.GenerateCreateScript();

        Assert.Contains("ck_reviews_rating", script, StringComparison.Ordinal);
        Assert.Contains("watchlist_entries", script, StringComparison.Ordinal);
        Assert.Contains("movie_snapshots", script, StringComparison.Ordinal);
    }
}
