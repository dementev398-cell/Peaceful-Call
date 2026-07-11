import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

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

// Must be mounted before body parsers (the proxy streams raw bytes).
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

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

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
