import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MovieSummary } from '../core/models';
import { MovieCardComponent } from './movie-card.component';

describe('MovieCardComponent', () => {
  const movie: MovieSummary = {
    id: 550,
    title: 'Fight Club',
    overview: 'An insomniac meets a soap maker.',
    releaseDate: '1999-10-15',
    providerRating: 8.4,
    voteCount: 30000,
    posterUrl: null,
    backdropUrl: null,
  };

  it('renders accessible fallback artwork and provider rating', async () => {
    await TestBed.configureTestingModule({
      imports: [MovieCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(MovieCardComponent);
    fixture.componentRef.setInput('movie', movie);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      'Fight Club',
    );
    expect(element.textContent).toContain('TMDB');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/movies/550');
  });
});
