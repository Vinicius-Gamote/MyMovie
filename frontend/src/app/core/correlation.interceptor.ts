import { HttpInterceptorFn } from '@angular/common/http';

export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  const correlationId = globalThis.crypto?.randomUUID?.();
  return next(
    correlationId ? request.clone({ setHeaders: { 'X-Correlation-ID': correlationId } }) : request,
  );
};
