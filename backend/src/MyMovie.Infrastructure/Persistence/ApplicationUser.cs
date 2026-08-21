using Microsoft.AspNetCore.Identity;

namespace MyMovie.Infrastructure.Persistence;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
}
