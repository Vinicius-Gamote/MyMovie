using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MyMovie.Infrastructure.Persistence;

public sealed class DatabaseInitializer(
    AppDbContext dbContext,
    RoleManager<IdentityRole<Guid>> roleManager)
{
    public async Task InitializeAsync(bool applyMigrations, CancellationToken cancellationToken)
    {
        if (applyMigrations)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        foreach (var roleName in new[] { "Member", "Administrator" })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                if (!result.Succeeded)
                {
                    throw new InvalidOperationException($"Unable to create the {roleName} role.");
                }
            }
        }
    }
}
