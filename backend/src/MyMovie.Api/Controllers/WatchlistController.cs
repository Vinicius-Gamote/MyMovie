using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyMovie.Api.Extensions;
using MyMovie.Application.Watchlists;

namespace MyMovie.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/watchlist")]
[EnableRateLimiting("mutations")]
public sealed class WatchlistController(WatchlistService watchlistService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<WatchlistView>(StatusCodes.Status200OK)]
    public Task<WatchlistView> Get(CancellationToken cancellationToken) =>
        watchlistService.GetAsync(User.GetUserId(), cancellationToken);

    [HttpPut("movies/{movieId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Add(int movieId, CancellationToken cancellationToken)
    {
        await watchlistService.AddAsync(User.GetUserId(), movieId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("movies/{movieId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove(int movieId, CancellationToken cancellationToken)
    {
        await watchlistService.RemoveAsync(User.GetUserId(), movieId, cancellationToken);
        return NoContent();
    }
}
