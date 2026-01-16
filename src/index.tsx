import { serve } from "bun";
import { existsSync } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { networkInterfaces } from "os";
import { dirname, extname, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { setupRoutes } from "./server/routes";

// Static file serving setup
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");
const distIndex = resolve(distDir, "index.html");
const useDist =
  process.env.CLAUDE_CODE_WEBUI_USE_DIST !== "0" && existsSync(distIndex);
const distPrefix = distDir + sep;
const devIndex = useDist ? null : (await import("./index.html")).default;
const prodIndex = useDist ? Bun.file(distIndex) : null;

// Worker file for @pierre/diffs
const pierreDiffsWorkerPath = resolve(
  rootDir,
  "node_modules/@pierre/diffs/dist/worker/worker-portable.js",
);
const pierreDiffsWorkerFile = Bun.file(pierreDiffsWorkerPath);

// SPA routes - all these paths serve index.html for client-side routing
// Use separate variables to avoid null type issues
const indexRoutes = devIndex
  ? {
      "/": devIndex,
      "/index.html": devIndex,
      "/settings": devIndex,
      "/chat/:sessionId": devIndex,
    }
  : {
      "/": prodIndex!,
      "/index.html": prodIndex!,
      "/settings": prodIndex!,
      "/chat/:sessionId": prodIndex!,
    };

const staticContentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// Server configuration
const PORT = Number(process.env.PORT ?? 10086);
const rawCorsOrigin = process.env.CORS_ORIGIN ?? "*";
const corsOrigins = rawCorsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins;

// Initialize Hono app
const app = new Hono();

// Logger middleware - custom formatted request logs
app.use(
  "*",
  logger((message, ...rest) => {
    // Parse the log message to extract method, path, status, and time
    const match = message.match(
      /^(-->|<--)\s+(\w+)\s+(.+?)(?:\s+(\d+)\s+(.+))?$/,
    );
    if (match) {
      const [, arrow, method, path, status, time] = match;
      if (arrow === "-->") {
        // Response log with status code
        const statusColor =
          status && parseInt(status) >= 400 ? "\x1b[31m" : "\x1b[32m";
        const methodColor = "\x1b[36m"; // Cyan
        const reset = "\x1b[0m";
        const dim = "\x1b[2m";
        console.log(
          `${dim}[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}]${reset} ${methodColor}${method}${reset} ${path} ${statusColor}${status}${reset} ${dim}${time}${reset}`,
        );
      }
    } else {
      // Fallback to original message
      console.log(message, ...rest);
    }
  }),
);

// CORS middleware
app.use(
  "*",
  cors({
    origin: corsOrigin,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: corsOrigin !== "*",
  }),
);

// Setup all routes and get WebSocket controller
const { wsController } = setupRoutes(app);

// Start server
const server = serve({
  port: PORT,
  hostname: "0.0.0.0",
  routes: indexRoutes,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws" && server.upgrade(req)) {
      return;
    }

    // Serve @pierre/diffs worker file
    if (url.pathname === "/pierre-diffs-worker.js") {
      return new Response(pierreDiffsWorkerFile, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
        },
      });
    }

    // API routes
    if (url.pathname.startsWith("/api")) {
      return app.fetch(req);
    }

    // Static file serving
    if (req.method === "GET") {
      if (useDist) {
        const filePath = resolve(distDir, "." + url.pathname);
        if (filePath === distDir || filePath.startsWith(distPrefix)) {
          const file = Bun.file(filePath);
          if (await file.exists()) {
            const contentType = staticContentTypes[extname(filePath)];
            if (contentType) {
              return new Response(file, {
                headers: {
                  "Content-Type": contentType,
                },
              });
            }
            return file;
          }
        }
      }
    }

    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      wsController.handleOpen(ws);
    },
    close(ws) {
      wsController.handleClose(ws);
    },
    message(ws, message) {
      wsController.handleMessage(ws, message);
    },
  },
  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

// Display server addresses
const serverUrl = new URL(server.url);
const port = serverUrl.port || String(PORT);
const localAddresses = new Set<string>(["127.0.0.1"]);
const nets = networkInterfaces();
for (const netInterfaces of Object.values(nets)) {
  for (const net of netInterfaces ?? []) {
    if (net.family === "IPv4" && !net.internal) {
      localAddresses.add(net.address);
    }
  }
}

console.log("🚀 Server running at:");
for (const address of localAddresses) {
  console.log(`  http://${address}:${port}/`);
}
