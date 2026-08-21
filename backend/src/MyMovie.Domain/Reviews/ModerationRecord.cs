namespace MyMovie.Domain.Reviews;

public sealed record ModerationRecord(
    Guid Id,
    Guid AdministratorUserId,
    string Action,
    string Reason,
    DateTimeOffset CreatedAt);
