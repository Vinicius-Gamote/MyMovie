using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyMovie.Application.Common;
using MyMovie.Application.Identity;
using MyMovie.Infrastructure.Persistence;

namespace MyMovie.Infrastructure.Identity;

public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager) : IIdentityService
{
    public async Task<UserProfile> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var displayName = request.DisplayName.Trim();
        var errors = new Dictionary<string, string[]>();
        if (displayName.Length is < 2 or > 100)
        {
            errors["displayName"] = ["Display name must contain between 2 and 100 characters."];
        }

        if (email.Length == 0)
        {
            errors["email"] = ["Email is required."];
        }

        if (errors.Count > 0)
        {
            throw new AppValidationException(errors);
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            DisplayName = displayName,
            CreatedAt = DateTimeOffset.UtcNow,
            IsActive = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new AppValidationException(ToErrors(result.Errors));
        }

        var roleResult = await userManager.AddToRoleAsync(user, "Member");
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            throw new InvalidOperationException("The member role could not be assigned.");
        }
        await signInManager.SignInAsync(user, isPersistent: false);
        return await ToProfileAsync(user, cancellationToken);
    }

    public async Task<UserProfile> SignInAsync(SignInRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = userManager.NormalizeEmail(request.Email.Trim());
        var user = await userManager.Users.SingleOrDefaultAsync(
            candidate => candidate.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new AppValidationException("The email or password is invalid.");
        }

        var result = await signInManager.PasswordSignInAsync(
            user,
            request.Password,
            request.RememberMe,
            lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            throw new AppValidationException("The email or password is invalid.");
        }

        return await ToProfileAsync(user, cancellationToken);
    }

    public Task SignOutAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return signInManager.SignOutAsync();
    }

    public async Task<UserProfile?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userManager.Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == userId && candidate.IsActive, cancellationToken);
        return user is null ? null : await ToProfileAsync(user, cancellationToken);
    }

    private async Task<UserProfile> ToProfileAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var roles = await userManager.GetRolesAsync(user);
        return new UserProfile(user.Id, user.Email ?? string.Empty, user.DisplayName, roles.ToArray());
    }

    private static IReadOnlyDictionary<string, string[]> ToErrors(IEnumerable<IdentityError> errors) =>
        errors.GroupBy(error => error.Code)
            .ToDictionary(group => ToField(group.Key), group => group.Select(error => error.Description).ToArray());

    private static string ToField(string code) =>
        code.Contains("Password", StringComparison.OrdinalIgnoreCase) ? "password" : "email";
}
