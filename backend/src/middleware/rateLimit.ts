import rateLimit from 'express-rate-limit';

/**
 * Rate limiter configuration options shared across all limiters
 * validate.trustProxy: false - Skip trust proxy validation (Railway is a trusted proxy)
 */
const rateLimitConfig = {
  validate: {
    trustProxy: false, // Skip trust proxy validation - Railway is a trusted proxy
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  message: 'Too many password reset requests, please try again later.',
  skipSuccessfulRequests: false, // Count all requests (even successful ones)
});

/**
 * Rate limiter for email verification requests
 * 5 attempts per hour per IP
 */
export const emailVerificationRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many verification attempts, please try again later.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for general auth endpoints
 * 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
});
