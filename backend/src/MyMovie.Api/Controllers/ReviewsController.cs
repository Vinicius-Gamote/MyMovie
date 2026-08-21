using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyMovie.Api.Extensions;
using MyMovie.Application.Common;
using MyMovie.Application.Reviews;

namespace MyMovie.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class ReviewsController(ReviewService reviewService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("movies/{movieId:int}/reviews")]
    [ProducesResponseType<PagedResult<ReviewView>>(StatusCodes.Status200OK)]
    public Task<PagedResult<ReviewView>> List(
        int movieId,
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default) =>
        reviewService.ListAsync(movieId, page, cancellationToken);

    [Authorize]
    [EnableRateLimiting("mutations")]
    [HttpPost("movies/{movieId:int}/reviews")]
    [ProducesResponseType<ReviewView>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ReviewView>> Create(
        int movieId,
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        var review = await reviewService.CreateAsync(User.GetUserId(), movieId, request, cancellationToken);
        return Created($"/api/v1/reviews/{review.Id}", review);
    }

    [Authorize]
    [EnableRateLimiting("mutations")]
    [HttpPut("reviews/{reviewId:guid}")]
    [ProducesResponseType<ReviewView>(StatusCodes.Status200OK)]
    public Task<ReviewView> Update(
        Guid reviewId,
        UpdateReviewRequest request,
        CancellationToken cancellationToken) =>
        reviewService.UpdateAsync(User.GetUserId(), reviewId, request, cancellationToken);

    [Authorize]
    [EnableRateLimiting("mutations")]
    [HttpDelete("reviews/{reviewId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid reviewId,
        [FromQuery] int version,
        CancellationToken cancellationToken)
    {
        await reviewService.DeleteAsync(User.GetUserId(), reviewId, version, cancellationToken);
        return NoContent();
    }
}
