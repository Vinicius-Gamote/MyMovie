import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MovieSummary } from '../core/models';
import { MovieCarouselComponent } from './movie-carousel.component';

describe('MovieCarouselComponent', () => {
  const movies: MovieSummary[] = [
    {
      id: 101,
      title: 'Arrival',
      overview: 'A linguist tries to communicate with mysterious visitors.',
      releaseDate: '2016-11-11',
      providerRating: 7.9,
      voteCount: 18500,
      posterUrl: null,
      backdropUrl: null,
    },
    {
      id: 102,
      title: 'Dune',
      overview: 'A gifted young man travels to the most dangerous planet in the universe.',
      releaseDate: '2021-10-22',
      providerRating: 8,
      voteCount: 13000,
      posterUrl: null,
      backdropUrl: null,
    },
  ];

  it('renders an accessible movie list with carousel controls', async () => {
    await TestBed.configureTestingModule({
      imports: [MovieCarouselComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieCarouselComponent);
    fixture.componentRef.setInput('movies', movies);
    fixture.componentRef.setInput('label', 'Latest movies carousel');
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const region = element.querySelector<HTMLElement>('[role="region"]');
    const slides = element.querySelectorAll('[role="listitem"]');
    const controls = element.querySelectorAll('.carousel-actions button');

    expect(region?.getAttribute('aria-label')).toBe('Latest movies carousel');
    expect(slides).toHaveLength(2);
    expect(controls).toHaveLength(2);
    expect(element.textContent).toContain('Movie 1 of 2');
  });

  it('emits the selected movie from the optional remove action', async () => {
    await TestBed.configureTestingModule({
      imports: [MovieCarouselComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieCarouselComponent);
    const removed: MovieSummary[] = [];
    fixture.componentRef.setInput('movies', movies);
    fixture.componentRef.setInput('allowRemoval', true);
    fixture.componentInstance.removeRequested.subscribe((movie) => removed.push(movie));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.remove-action')
      ?.click();

    expect(removed).toEqual([movies[0]]);
  });
});
