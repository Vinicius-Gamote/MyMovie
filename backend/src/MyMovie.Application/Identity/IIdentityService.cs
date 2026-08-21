namespace MyMovie.Application.Identity;

public interface IIdentityService
{
    Task<UserProfile> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken);

    Task<UserProfile> SignInAsync(SignInRequest request, CancellationToken cancellationToken);

    Task SignOutAsync(CancellationToken cancellationToken);

    Task<UserProfile?> GetUserAsync(Guid userId, CancellationToken cancellationToken);
}
