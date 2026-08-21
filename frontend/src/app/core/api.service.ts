import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MovieDetails, MovieSummary, PagedResult, ReviewView, WatchlistView } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  latestMovies(page: number): Observable<PagedResult<MovieSummary>> {
    return this.http.get<PagedResult<MovieSummary>>('/api/v1/movies/latest', {
      params: { page },
    });
  }

  searchMovies(query: string, page: number): Observable<PagedResult<MovieSummary>> {
    return this.http.get<PagedResult<MovieSummary>>('/api/v1/movies/search', {
      params: { query, page },
    });
  }

  movieDetails(movieId: number): Observable<MovieDetails> {
    return this.http.get<MovieDetails>(`/api/v1/movies/${movieId}`);
  }

  watchlist(): Observable<WatchlistView> {
    return this.http.get<WatchlistView>('/api/v1/watchlist');
  }

  addToWatchlist(movieId: number): Observable<void> {
    return this.http.put<void>(`/api/v1/watchlist/movies/${movieId}`, null);
  }

  removeFromWatchlist(movieId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/watchlist/movies/${movieId}`);
  }

  reviews(movieId: number, page = 1): Observable<PagedResult<ReviewView>> {
    return this.http.get<PagedResult<ReviewView>>(`/api/v1/movies/${movieId}/reviews`, {
      params: { page },
    });
  }

  createReview(movieId: number, rating: number, text: string): Observable<ReviewView> {
    return this.http.post<ReviewView>(`/api/v1/movies/${movieId}/reviews`, { rating, text });
  }

  updateReview(
    reviewId: string,
    rating: number,
    text: string,
    version: number,
  ): Observable<ReviewView> {
    return this.http.put<ReviewView>(`/api/v1/reviews/${reviewId}`, { rating, text, version });
  }

  deleteReview(reviewId: string, version: number): Observable<void> {
    const params = new HttpParams().set('version', version);
    return this.http.delete<void>(`/api/v1/reviews/${reviewId}`, { params });
  }

  moderationQueue(status = 'Published', page = 1): Observable<PagedResult<ReviewView>> {
    return this.http.get<PagedResult<ReviewView>>('/api/v1/admin/reviews', {
      params: { status, page },
    });
  }

  hideReview(reviewId: string, reason: string): Observable<void> {
    return this.http.post<void>(`/api/v1/admin/reviews/${reviewId}/hide`, { reason });
  }

  restoreReview(reviewId: string, reason: string): Observable<void> {
    return this.http.post<void>(`/api/v1/admin/reviews/${reviewId}/restore`, { reason });
  }
}
