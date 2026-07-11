import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";

// The bundled ESM banner sets global __dirname, which is the easiest way to
// resolve neighboring artifact build outputs in production.
declare const __dirname: string | undefined;

const app: Express = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// In production, validate against an explicit allowlist from CORS_ALLOWED_ORIGINS
// (comma-separated). Falls back to origin:true in development for convenience.
const corsOrigin: cors.CorsOptions["origin"] = (() => {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  if (!raw) {
    // No allowlist configured — permissive fallback so a misconfigured deploy
    // doesn't silently break; operators should set CORS_ALLOWED_ORIGINS.
    return true;
  }
  const allowed = new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void,
  ) => {
    // Same-origin requests (no Origin header) and allowlisted origins pass.
    if (!origin || allowed.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin not allowed: ${origin}`));
    }
  };
})();

app.use(cors({ credentials: true, origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use("/api", router);

// In a single-service Render deploy, serve the built frontend from the sibling
// chat-hub artifact. If the directory isn't present (e.g. development without a
// prior web build), we simply skip static serving and the API keeps working.
const webDist = typeof __dirname === "string"
  ? path.resolve(__dirname, "../../chat-hub/dist/public")
  : path.resolve(process.cwd(), "../chat-hub/dist/public");

if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback for any non-API GET request. Express 5 doesn't accept '*' in
  // app.get(...), so we use a regex that matches everything.
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

export default app;
