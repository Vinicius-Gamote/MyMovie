import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Discover movies | MyMovie',
    loadComponent: () =>
      import('./features/catalog/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'search',
    title: 'Search movies | MyMovie',
    loadComponent: () =>
      import('./features/catalog/search.component').then((module) => module.SearchComponent),
  },
  {
    path: 'movies/:movieId',
    loadComponent: () =>
      import('./features/catalog/movie-details.component').then(
        (module) => module.MovieDetailsComponent,
      ),
  },
  {
    path: 'sign-in',
    title: 'Sign in | MyMovie',
    loadComponent: () =>
      import('./features/identity/sign-in.component').then((module) => module.SignInComponent),
  },
  {
    path: 'register',
    title: 'Create account | MyMovie',
    loadComponent: () =>
      import('./features/identity/register.component').then((module) => module.RegisterComponent),
  },
  {
    path: 'watchlist',
    title: 'My watchlist | MyMovie',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/watchlist/watchlist.component').then(
        (module) => module.WatchlistComponent,
      ),
  },
  {
    path: 'admin/reviews',
    title: 'Review moderation | MyMovie',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/reviews/admin-reviews.component').then(
        (module) => module.AdminReviewsComponent,
      ),
  },
  {
    path: '**',
    title: 'Page not found | MyMovie',
    loadComponent: () =>
      import('./shared/not-found.component').then((module) => module.NotFoundComponent),
  },
];
