using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyMovie.Api.Extensions;
using MyMovie.Application.Identity;

namespace MyMovie.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/users")]
public sealed class UsersController(IIdentityService identityService) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType<UserProfile>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfile>> GetMe(CancellationToken cancellationToken)
    {
        var profile = await identityService.GetUserAsync(User.GetUserId(), cancellationToken);
        return profile is null ? Unauthorized() : Ok(profile);
    }
}
