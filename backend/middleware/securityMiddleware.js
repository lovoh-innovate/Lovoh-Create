import rateLimit from 'express-rate-limit';

// ===== RATE LIMITERS =====

// Global rate limiter for ALL routes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for static assets (images, CSS, JS, fonts, etc.)
    return req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|bmp|tiff|mp4|webm|ogg|mp3|wav|flac|pdf|zip|gz|rar)$/);
  },
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes (login, register, forgot password, etc.)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// API-specific limiter for heavy endpoints (search, reports, etc.)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: "Rate limit exceeded for this endpoint.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});