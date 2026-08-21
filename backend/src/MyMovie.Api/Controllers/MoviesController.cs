using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyMovie.Application.Catalog;
using MyMovie.Application.Common;

namespace MyMovie.Api.Controllers;

[ApiController]
[Route("api/v1/movies")]
[EnableRateLimiting("catalog")]
public sealed class MoviesController(CatalogService catalogService) : ControllerBase
{
    [HttpGet("latest")]
    [ProducesResponseType<PagedResult<MovieSummary>>(StatusCodes.Status200OK)]
    public Task<PagedResult<MovieSummary>> GetLatest(
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default) =>
        catalogService.GetLatestAsync(page, cancellationToken);

    [HttpGet("search")]
    [ProducesResponseType<PagedResult<MovieSummary>>(StatusCodes.Status200OK)]
    public Task<PagedResult<MovieSummary>> Search(
        [FromQuery] string? query,
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default) =>
        catalogService.SearchAsync(query, page, cancellationToken);

    [HttpGet("{movieId:int}")]
    [ProducesResponseType<MovieDetails>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public Task<MovieDetails> GetDetails(int movieId, CancellationToken cancellationToken) =>
        catalogService.GetDetailsAsync(movieId, cancellationToken);
}
