import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";

// In-memory favorites store (replace with DB table in production)
const favorites = new Map<string, Set<string>>(); // userId → Set<workerId>

function getUserFavorites(userId: string): Set<string> {
  if (!favorites.has(userId)) {
    favorites.set(userId, new Set());
  }
  return favorites.get(userId)!;
}

const favoritesRouter = new Hono();
favoritesRouter.use("/favorites/*", authMiddleware);

// GET /favorites/workers — list favorite workers
favoritesRouter.get("/favorites/workers", async (context) => {
  const authUser = context.get("user");
  const favs = getUserFavorites(authUser.userId);

  return context.json({
    success: true,
    data: {
      worker_ids: [...favs],
      total: favs.size,
    },
  });
});

// POST /favorites/workers/:workerId — add worker to favorites
favoritesRouter.post("/favorites/workers/:workerId", async (context) => {
  const authUser = context.get("user");
  const workerId = context.req.param("workerId");

  if (!workerId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Worker ID wajib diisi" } },
      400,
    );
  }

  const favs = getUserFavorites(authUser.userId);
  favs.add(workerId);

  return context.json({
    success: true,
    data: { worker_id: workerId, is_favorite: true },
  });
});

// DELETE /favorites/workers/:workerId — remove worker from favorites
favoritesRouter.delete("/favorites/workers/:workerId", async (context) => {
  const authUser = context.get("user");
  const workerId = context.req.param("workerId");

  if (!workerId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Worker ID wajib diisi" } },
      400,
    );
  }

  const favs = getUserFavorites(authUser.userId);
  favs.delete(workerId);

  return context.json({
    success: true,
    data: { worker_id: workerId, is_favorite: false },
  });
});

// GET /favorites/workers/:workerId/check — check if worker is favorited
favoritesRouter.get("/favorites/workers/:workerId/check", async (context) => {
  const authUser = context.get("user");
  const workerId = context.req.param("workerId");
  const favs = getUserFavorites(authUser.userId);

  return context.json({
    success: true,
    data: { worker_id: workerId, is_favorite: favs.has(workerId ?? "") },
  });
});

export { favoritesRouter };
