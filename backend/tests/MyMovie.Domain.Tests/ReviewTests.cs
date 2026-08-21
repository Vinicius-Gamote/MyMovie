using MyMovie.Domain.Catalog;
using MyMovie.Domain.Common;
using MyMovie.Domain.Reviews;

namespace MyMovie.Domain.Tests;

public sealed class ReviewTests
{
    private const string ValidText = "This movie has thoughtful characters, confident direction, and a memorable final act.";

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void Rating_RejectsValuesOutsideTheScale(int value) =>
        Assert.Throws<DomainException>(() => new Rating(value));

    [Fact]
    public void Review_UpdateEnforcesOwnershipAndVersion()
    {
        var author = Guid.NewGuid();
        var review = Review.Create(
            author,
            new MovieReference("tmdb", 550),
            new Rating(8),
            new ReviewText(ValidText),
            DateTimeOffset.UtcNow);

        Assert.Throws<DomainException>(() => review.Update(
            Guid.NewGuid(),
            new Rating(9),
            new ReviewText(ValidText),
            1,
            DateTimeOffset.UtcNow));
        Assert.Throws<DomainException>(() => review.Update(
            author,
            new Rating(9),
            new ReviewText(ValidText),
            2,
            DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Review_ModerationIsAuditable()
    {
        var review = Review.Create(
            Guid.NewGuid(),
            new MovieReference("tmdb", 550),
            new Rating(8),
            new ReviewText(ValidText),
            DateTimeOffset.UtcNow);

        review.Hide(Guid.NewGuid(), "Contains a spoiler without warning.", DateTimeOffset.UtcNow);

        Assert.Equal(ReviewStatus.Hidden, review.Status);
        Assert.Single(review.ModerationRecords);
        Assert.Equal("Hidden", review.ModerationRecords.Single().Action);
    }
}
