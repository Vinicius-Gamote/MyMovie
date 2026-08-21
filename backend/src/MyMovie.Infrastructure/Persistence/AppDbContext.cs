using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MyMovie.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<WatchlistEntity> Watchlists => Set<WatchlistEntity>();
    public DbSet<WatchlistEntryEntity> WatchlistEntries => Set<WatchlistEntryEntity>();
    public DbSet<ReviewEntity> Reviews => Set<ReviewEntity>();
    public DbSet<ModerationRecordEntity> ReviewModerationRecords => Set<ModerationRecordEntity>();
    public DbSet<MovieSnapshotEntity> MovieSnapshots => Set<MovieSnapshotEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasDefaultSchema("app");

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("users");
            entity.Property(user => user.DisplayName).HasMaxLength(100).IsRequired();
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
        });

        builder.Entity<IdentityRole<Guid>>().ToTable("roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        builder.Entity<WatchlistEntity>(entity =>
        {
            entity.ToTable("watchlists");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.OwnerUserId).IsUnique();
            entity.HasMany(item => item.Entries)
                .WithOne(item => item.Watchlist)
                .HasForeignKey(item => item.WatchlistId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<WatchlistEntryEntity>(entity =>
        {
            entity.ToTable("watchlist_entries");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Provider).HasMaxLength(32).IsRequired();
            entity.HasIndex(item => new { item.WatchlistId, item.Provider, item.ProviderMovieId }).IsUnique();
        });

        builder.Entity<ReviewEntity>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Provider).HasMaxLength(32).IsRequired();
            entity.Property(item => item.Text).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.Status).HasMaxLength(20).IsRequired();
            entity.Property(item => item.Version).IsConcurrencyToken();
            entity.ToTable(table => table.HasCheckConstraint("ck_reviews_rating", "rating >= 1 AND rating <= 10"));
            entity.HasIndex(item => new { item.Provider, item.ProviderMovieId, item.Status, item.CreatedAt });
            entity.HasIndex(item => new { item.AuthorUserId, item.Provider, item.ProviderMovieId })
                .IsUnique()
                .HasFilter("status <> 'Deleted'");
            entity.HasOne(item => item.Author)
                .WithMany()
                .HasForeignKey(item => item.AuthorUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ModerationRecordEntity>(entity =>
        {
            entity.ToTable("review_moderation_records");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Action).HasMaxLength(32).IsRequired();
            entity.Property(item => item.Reason).HasMaxLength(500).IsRequired();
            entity.HasOne(item => item.Review)
                .WithMany(item => item.ModerationRecords)
                .HasForeignKey(item => item.ReviewId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<MovieSnapshotEntity>(entity =>
        {
            entity.ToTable("movie_snapshots");
            entity.HasKey(item => new { item.Provider, item.ProviderMovieId });
            entity.Property(item => item.Provider).HasMaxLength(32);
            entity.Property(item => item.PayloadJson).HasColumnType("jsonb");
            entity.HasIndex(item => item.ServeUntil);
        });
    }
}
