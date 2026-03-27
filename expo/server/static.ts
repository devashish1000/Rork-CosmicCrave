import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const ASSET_EXT_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)$/i;

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for app routes only; missing assets should stay 404.
  app.use("/{*path}", (req, res) => {
    const pathname = req.path ?? "";
    if (ASSET_EXT_RE.test(pathname)) {
      res.status(404).set({ "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
