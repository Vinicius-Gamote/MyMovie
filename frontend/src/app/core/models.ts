export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
}

export interface MovieSummary {
  id: number;
  title: string;
  overview: string | null;
  releaseDate: string | null;
  providerRating: number | null;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  order: number;
}

export interface MovieDetails extends MovieSummary {
  tagline: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  cast: CastMember[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface WatchlistItem {
  movie: MovieSummary;
  addedAt: string;
}

export interface WatchlistView {
  items: WatchlistItem[];
}

export type ReviewStatus = 'Published' | 'Hidden' | 'Deleted';

export interface ReviewView {
  id: string;
  authorUserId: string;
  authorDisplayName: string;
  movieId: number;
  rating: number;
  text: string;
  status: ReviewStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemDetails {
  title: string;
  detail?: string;
  status: number;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
