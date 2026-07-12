import type { ApiError, ApiSuccess } from '@aayu-aura/shared-types';

export function ok<TData, TMeta = Record<string, unknown>>(
  data: TData,
  meta?: TMeta,
): ApiSuccess<TData, TMeta> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function fail(
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): ApiError {
  return {
    success: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  };
}
