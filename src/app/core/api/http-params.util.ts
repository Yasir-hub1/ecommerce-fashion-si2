import { HttpParams } from '@angular/common/http';

/** Build HttpParams omitting null/undefined/empty values */
export function toHttpParams(params?: Record<string, string | number | boolean | null | undefined>): HttpParams {
  const entries = Object.entries(params ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return new HttpParams({
    fromObject: Object.fromEntries(entries.map(([k, v]) => [k, String(v)])),
  });
}
