import { Hono } from "hono";
import { env } from "../../config/env";
import { DEV_VIEW_HTML } from "./view";

const devRouter = new Hono();

devRouter.get("/", (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }
  return context.html(DEV_VIEW_HTML);
});

export { devRouter };
