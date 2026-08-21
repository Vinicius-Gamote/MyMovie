import { AfterViewInit, Directive, ElementRef, OnDestroy, output } from '@angular/core';

@Directive({ selector: '[appInfiniteScroll]' })
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  readonly reached = output<void>();
  private observer?: IntersectionObserver;

  constructor(private readonly element: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) this.reached.emit();
      },
      { rootMargin: '240px' },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
