import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeScan, parseAnalyzeRequest } from "./scan-analyzer";
import { env } from "./env";
import { requireAuth, type AuthenticatedRequest } from "./middleware/auth";
import { scanRateLimit, apiRateLimit } from "./middleware/rate-limit";
import { validateScanRequest, securityHeaders } from "./middleware/security";
import { checkScanQuota, recordScanUsage } from "./lib/quota";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply security headers to all routes
  app.use(securityHeaders);
  
  // Apply general API rate limiting
  app.use("/api", apiRateLimit);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      env: {
        geminiConfigured: env.hasGemini,
        supabaseConfigured: env.hasSupabase,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Quota info endpoint
  app.get("/api/quota", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const quota = await checkScanQuota(req.user.id);
      res.json(quota);
    } catch (error) {
      console.error("Quota check error:", error);
      res.status(500).json({ error: "Failed to check quota" });
    }
  });

  // Subscription info endpoint
  app.get("/api/subscription", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      res.json({
        tier: req.user.tier,
        userId: req.user.id,
      });
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  // Scan history endpoint
  app.get("/api/scans/history", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // This would query scan_usage table - simplified for now
      res.json({
        scans: [],
        total: 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Scan history error:", error);
      res.status(500).json({ error: "Failed to get scan history" });
    }
  });

  // Scan analyze endpoint - requires auth, rate limiting, and security validation
  app.post(
    "/api/scan/analyze",
    requireAuth,
    scanRateLimit,
    validateScanRequest,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // Check quota before processing
        const quota = await checkScanQuota(req.user.id);
        if (!quota.canScan) {
          const limitMessage = quota.tier === 'free' 
            ? `Weekly: ${quota.weeklyCount}/${quota.weeklyLimit}, Monthly: ${quota.monthlyCount}/${quota.monthlyLimit}`
            : `Monthly: ${quota.monthlyCount}/${quota.monthlyLimit}`;
          
          return res.status(403).json({
            error: "quota_exceeded",
            message: `You've reached your scan limit. ${limitMessage}`,
            quota,
            upgradeUrl: "/settings/upgrade",
          });
        }

        // Parse and validate request
        const payload = parseAnalyzeRequest(req.body);
        const fallbackScanId = payload.scanId || `scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Process scan
        let analyzed;
        let scanError: string | undefined;

        try {
          analyzed = await analyzeScan(payload);
          
          // Record successful scan
          await recordScanUsage(
            req.user.id,
            analyzed.scanId,
            payload.source || 'camera',
            true
          );
        } catch (error) {
          scanError = error instanceof Error ? error.message : "Scan failed";
          
          // Record failed scan
          await recordScanUsage(
            req.user.id,
            fallbackScanId,
            payload.source || 'camera',
            false,
            scanError
          );

          throw error;
        }

        // Return results with updated quota
        const updatedQuota = await checkScanQuota(req.user.id);
        
        return res.status(200).json({
          ...analyzed,
          quota: updatedQuota,
        });
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        return res.status(400).json({ message: "Invalid scan request" });
      }
    }
  );

  return httpServer;
}
