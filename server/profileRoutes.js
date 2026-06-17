export function registerProfileRoutes(app) {
  app.get("/api/profile-ping", (_req, res) => {
    res.json({ ok: true });
  });
}
