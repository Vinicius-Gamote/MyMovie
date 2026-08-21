using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyMovie.Application.Identity;

namespace MyMovie.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[EnableRateLimiting("authentication")]
public sealed class AuthController(IIdentityService identityService) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType<UserProfile>(StatusCodes.Status201Created)]
    public async Task<ActionResult<UserProfile>> Register(
        RegisterUserRequest request,
        CancellationToken cancellationToken)
    {
        var profile = await identityService.RegisterAsync(request, cancellationToken);
        return Created("/api/v1/users/me", profile);
    }

    [HttpPost("sign-in")]
    [ProducesResponseType<UserProfile>(StatusCodes.Status200OK)]
    public Task<UserProfile> SignIn(SignInRequest request, CancellationToken cancellationToken) =>
        identityService.SignInAsync(request, cancellationToken);

    [Authorize]
    [HttpPost("sign-out")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await identityService.SignOutAsync(cancellationToken);
        return NoContent();
    }
}
