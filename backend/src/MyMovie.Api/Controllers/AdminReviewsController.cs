using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyMovie.Api.Extensions;
using MyMovie.Application.Common;
using MyMovie.Application.Reviews;
using MyMovie.Domain.Reviews;

namespace MyMovie.Api.Controllers;

[ApiController]
[Authorize(Roles = "Administrator")]
[EnableRateLimiting("mutations")]
[Route("api/v1/admin/reviews")]
public sealed class AdminReviewsController(ReviewService reviewService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<ReviewView>>(StatusCodes.Status200OK)]
    public Task<PagedResult<ReviewView>> List(
        [FromQuery] ReviewStatus status = ReviewStatus.Published,
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default) =>
        reviewService.ListForModerationAsync(status, page, cancellationToken);

    [HttpPost("{reviewId:guid}/hide")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Hide(
        Guid reviewId,
        ModerateReviewRequest request,
        CancellationToken cancellationToken)
    {
        await reviewService.HideAsync(User.GetUserId(), reviewId, request.Reason, cancellationToken);
        return NoContent();
    }

    [HttpPost("{reviewId:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Restore(
        Guid reviewId,
        ModerateReviewRequest request,
        CancellationToken cancellationToken)
    {
        await reviewService.RestoreAsync(User.GetUserId(), reviewId, request.Reason, cancellationToken);
        return NoContent();
    }
}
