import { expect, Page, test } from '@playwright/test';

const posterDataUrl =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"%3E%3Crect width="500" height="750" fill="%23141b2d"/%3E%3Ccircle cx="250" cy="300" r="150" fill="%237aa2f7"/%3E%3C/svg%3E';

const movie = {
  id: 101,
  title: 'Arrival',
  overview: 'A linguist works with the military to communicate with mysterious visitors.',
  releaseDate: '2016-11-11',
  providerRating: 7.9,
  voteCount: 18_500,
  posterUrl: posterDataUrl,
  backdropUrl: null,
};

const pageOfMovies = {
  items: [movie],
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalResults: 1,
  hasNextPage: false,
};

const carouselMovies = Array.from({ length: 8 }, (_, index) => ({
  ...movie,
  id: movie.id + index,
  title: index === 0 ? movie.title : `Movie ${index + 1}`,
}));

async function mockSignedOutSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/csrf', (route) =>
    route.fulfill({ status: 204, headers: { 'set-cookie': 'XSRF-TOKEN=e2e-token; Path=/' } }),
  );
  await page.route('**/api/v1/users/me', (route) => route.fulfill({ status: 401 }));
}

test.beforeEach(async ({ page }) => {
  await mockSignedOutSession(page);
});

test('visitor can open a movie from the latest feed and inspect its cast', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/movies/latest?*', (route) => route.fulfill({ json: pageOfMovies }));
  await page.route('**/api/v1/movies/101', (route) =>
    route.fulfill({
      json: {
        ...movie,
        tagline: 'Why are they here?',
        runtimeMinutes: 116,
        genres: ['Drama', 'Science Fiction'],
        cast: [
          {
            id: 1,
            name: 'Amy Adams',
            character: 'Louise Banks',
            profileUrl: null,
            order: 0,
          },
        ],
      },
    }),
  );
  await page.route('**/api/v1/movies/101/reviews?*', (route) =>
    route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 20,
        totalPages: 0,
        totalResults: 0,
        hasNextPage: false,
      },
    }),
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Latest movies' })).toBeVisible();
  await expect(page.getByText('Arrival', { exact: true })).toBeVisible();
  const cardPoster = await page.locator('.movie-card .poster-link img').boundingBox();
  expect(cardPoster).not.toBeNull();
  expect(cardPoster!.width).toBeLessThanOrEqual(256.5);
  expect(cardPoster!.height / cardPoster!.width).toBeCloseTo(1.5, 1);
  await page.getByRole('link', { name: 'View details for Arrival' }).click();

  await expect(page).toHaveURL(/\/movies\/101$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Arrival' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Main cast' })).toBeVisible();
  await expect(page.getByText('Amy Adams')).toBeVisible();
  await expect(page.getByText('No reviews yet')).toBeVisible();
  const detailPoster = await page.locator('.poster').boundingBox();
  expect(detailPoster).not.toBeNull();
  expect(detailPoster!.width).toBeLessThanOrEqual(224.5);
  expect(detailPoster!.height / detailPoster!.width).toBeCloseTo(1.5, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test('search is debounced, reflected in the URL, and remains responsive', async ({ page }) => {
  await page.route('**/api/v1/movies/search?*', (route) =>
    route.fulfill({
      json: {
        ...pageOfMovies,
        items: carouselMovies,
        totalResults: carouselMovies.length,
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/search');
  await page.getByRole('searchbox', { name: 'Movie title' }).fill('Arrival');

  await expect(page).toHaveURL(/\/search\?q=Arrival$/);
  await expect(page.getByText('8 results for “Arrival”')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View details for Arrival' })).toBeVisible();

  const carousel = page.getByRole('region', { name: 'Search results for Arrival' });
  const track = carousel.getByRole('list', { name: 'Search results for Arrival movies' });
  await expect(carousel.getByRole('listitem')).toHaveCount(8);
  await page
    .getByRole('button', { name: 'Show next movies in Search results for Arrival' })
    .click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('latest movies use a responsive, keyboard-accessible horizontal carousel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/v1/movies/latest?*', (route) =>
    route.fulfill({
      json: {
        ...pageOfMovies,
        items: carouselMovies,
        totalResults: carouselMovies.length,
      },
    }),
  );

  await page.goto('/');

  const carousel = page.getByRole('region', { name: 'Latest movies carousel' });
  const track = carousel.getByRole('list', { name: 'Latest movies carousel movies' });
  const next = page.getByRole('button', {
    name: 'Show next movies in Latest movies carousel',
  });

  await expect(carousel).toBeVisible();
  await expect(carousel.getByRole('listitem')).toHaveCount(8);
  await expect(next).toBeEnabled();
  await next.click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await track.focus();
  await track.press('Home');
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThan(4);
  await track.press('End');
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await page.setViewportSize({ width: 320, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const poster = await carousel.locator('.movie-card .poster-link img').first().boundingBox();
  expect(poster).not.toBeNull();
  expect(poster!.height / poster!.width).toBeCloseTo(1.5, 1);
});

test('watchlist uses the same carousel and removes movies without a page overflow', async ({
  page,
}) => {
  await page.unroute('**/api/v1/users/me');
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({
      json: {
        id: '4e171b65-358f-497f-a0a0-42ba15d9aa88',
        email: 'member@example.com',
        displayName: 'Movie Fan',
        roles: ['Member'],
      },
    }),
  );
  await page.route('**/api/v1/watchlist', (route) =>
    route.fulfill({
      json: {
        items: carouselMovies.slice(0, 4).map((item) => ({
          movie: item,
          addedAt: '2026-08-21T12:00:00Z',
        })),
      },
    }),
  );
  await page.route('**/api/v1/watchlist/movies/101', (route) => route.fulfill({ status: 204 }));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/watchlist');

  const carousel = page.getByRole('region', { name: 'Watchlist carousel' });
  await expect(page.getByRole('heading', { name: 'My watchlist' })).toBeVisible();
  await expect(carousel.getByRole('listitem')).toHaveCount(4);
  await page.getByRole('button', { name: 'Remove Arrival from watchlist' }).click();
  await expect(carousel.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('Arrival', { exact: true })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('search and account fields keep their icons inside the outline without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });

  for (const path of ['/search', '/sign-in', '/register']) {
    await page.goto(path);
    await expect(page.locator('mat-form-field').first()).toBeVisible();
    await expect(page.getByText('>', { exact: true })).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const fields = [...document.querySelectorAll('mat-form-field')];
      const icons = [...document.querySelectorAll('mat-form-field app-field-icon')];
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        icons: icons.map((icon) => {
          const iconBox = icon.getBoundingClientRect();
          const fieldBox = icon.closest('mat-form-field')!.getBoundingClientRect();
          return {
            width: iconBox.width,
            height: iconBox.height,
            insetStart: iconBox.left - fieldBox.left,
            insetEnd: fieldBox.right - iconBox.right,
          };
        }),
        fieldCount: fields.length,
      };
    });

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.icons).toHaveLength(layout.fieldCount);
    for (const icon of layout.icons) {
      expect(icon.width).toBeCloseTo(20, 0);
      expect(icon.height).toBeCloseTo(20, 0);
      expect(icon.insetStart).toBeGreaterThanOrEqual(10);
      expect(icon.insetEnd).toBeGreaterThan(20);
    }
  }
});

test('visitor can recover from a temporary provider error', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/movies/latest?*', (route) => {
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Movie provider unavailable',
          detail: 'Please try again.',
          status: 503,
          code: 'catalog.provider_unavailable',
        }),
      });
    }
    return route.fulfill({ json: pageOfMovies });
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Movies are temporarily unavailable' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Arrival', { exact: true })).toBeVisible();
});
