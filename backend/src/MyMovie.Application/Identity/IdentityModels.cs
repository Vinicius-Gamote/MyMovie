namespace MyMovie.Application.Identity;

public sealed record RegisterUserRequest(string Email, string DisplayName, string Password);

public sealed record SignInRequest(string Email, string Password, bool RememberMe);

public sealed record UserProfile(Guid Id, string Email, string DisplayName, IReadOnlyList<string> Roles);
