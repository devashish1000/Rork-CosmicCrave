import type { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Maximum data URL length (6.5MB)
const MAX_DATA_URL_LENGTH = 6_500_000;

/**
 * Validates image data URL format and content
 */
function validateImageDataUrl(dataUrl: string): { valid: boolean; error?: string } {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, error: 'Invalid image data' };
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return { valid: false, error: 'Image too large' };
  }

  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format' };
  }

  // Extract MIME type
  const mimeMatch = dataUrl.match(/^data:image\/([^;]+);/);
  if (!mimeMatch) {
    return { valid: false, error: 'Invalid MIME type' };
  }

  const mimeType = `image/${mimeMatch[1]}`;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: 'Unsupported image format' };
  }

  // Check base64 encoding
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data || base64Data.length === 0) {
    return { valid: false, error: 'Invalid base64 data' };
  }

  // Validate base64 characters
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Security middleware for scan API requests
 */
export function validateScanRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const body = req.body;

    // Validate imageDataUrl if present
    if (body.imageDataUrl) {
      const validation = validateImageDataUrl(body.imageDataUrl);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }
    }

    // Sanitize text inputs
    if (body.scanId) {
      body.scanId = sanitizeInput(body.scanId);
    }

    if (body.detectedHint && Array.isArray(body.detectedHint)) {
      body.detectedHint = body.detectedHint.map((hint: unknown) => sanitizeInput(hint));
    }

    // Validate dietary preferences if present
    if (body.dietaryPreferences) {
      const prefsSchema = z.object({
        dietType: z.string().optional(),
        allergies: z.array(z.string()).optional(),
      });
      const result = prefsSchema.safeParse(body.dietaryPreferences);
      if (!result.success) {
        res.status(400).json({ error: 'Invalid dietary preferences' });
        return;
      }
      body.dietaryPreferences = result.data;
    }

    next();
  } catch (err) {
    console.error('Security validation error:', err);
    res.status(500).json({ error: 'Validation failed' });
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers (adjust for production)
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}
