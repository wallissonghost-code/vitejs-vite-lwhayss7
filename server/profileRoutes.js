import { publicUser } from "./sqliteStore.js";
import { requireAuth } from "./auth.js";

export function registerProfileRoutes(app) {
  app.get("/api/profile", requireAuth, (req, res) => {
    res.json(publicUser(req.user));
  });

  app.post("/api/wallet/recharge", requireAuth, (req, res) => {
    res.json(publicUser(req.user));
  });
}
