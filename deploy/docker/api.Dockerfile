# syntax=docker/dockerfile:1.8
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /source

COPY global.json Directory.Build.props ./
COPY backend/MyMovie.slnx backend/
COPY backend/src/MyMovie.Api/MyMovie.Api.csproj backend/src/MyMovie.Api/
COPY backend/src/MyMovie.Application/MyMovie.Application.csproj backend/src/MyMovie.Application/
COPY backend/src/MyMovie.Domain/MyMovie.Domain.csproj backend/src/MyMovie.Domain/
COPY backend/src/MyMovie.Infrastructure/MyMovie.Infrastructure.csproj backend/src/MyMovie.Infrastructure/
RUN dotnet restore backend/src/MyMovie.Api/MyMovie.Api.csproj

COPY backend backend
RUN dotnet publish backend/src/MyMovie.Api/MyMovie.Api.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
LABEL org.opencontainers.image.title="MyMovie API" \
      org.opencontainers.image.description="MyMovie ASP.NET Core HTTP API"
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0
COPY --from=build --chown=$APP_UID:$APP_UID /app/publish ./
USER $APP_UID
EXPOSE 8080
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["dotnet", "MyMovie.Api.dll"]
