import type { Context } from "hono";
import { ZodError } from "zod";

export function errorHandler(err: Error, context: Context): Response {
  // If we already sent a response, don't try to send another
  if (context.res?.ok && context.res.body) {
    return context.res;
  }

  // Zod validation errors (fallback if not caught in route handler)
  if (err instanceof ZodError) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: err.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  // Known standard errors (Prisma, Domain, etc.) can be mapped here later
  // if (err instanceof PrismaClientKnownRequestError) { ... }

  // Fallback to generic 500 for unexpected errors. Never expose stack traces.
  const isDevelopment = process.env.NODE_ENV === "development";

  // eslint-disable-next-line no-console
  console.error("[Error Handler]", err);

  return context.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: isDevelopment ? "Terjadi kesalahan internal server" : "Terjadi kesalahan internal server",
      },
    },
    500,
  );
}