import type { Context } from "hono";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export function parsePagination(context: Context): PaginationParams {
  const rawPage = Number(context.req.query("page"));
  const rawLimit = Number(context.req.query("limit"));

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
}

export function paginate<T>(items: T[], params: PaginationParams): { items: T[]; meta: PaginationMeta } {
  const { page, limit, offset } = params;
  return {
    items: items.slice(offset, offset + limit),
    meta: { total: items.length, page, limit },
  };
}
