export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export function successResponse<T>(data: T, meta?: ApiResponse["meta"]): ApiResponse<T> {
  return { success: true, data, meta };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>,
): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}
