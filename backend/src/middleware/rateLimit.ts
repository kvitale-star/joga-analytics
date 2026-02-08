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
 * Disabled in test environment to allow test suite to run
 */
// Create the actual rate limiter
const actualLoginRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Helper to check if we're in test environment
const isTestEnv = () => {
  return process.env.NODE_ENV === 'test' || 
         process.env.JEST_WORKER_ID !== undefined ||
         process.env.DISABLE_RATE_LIMIT === 'true';
};

// In test mode, create a no-op middleware that just calls next()
const noOpRateLimiter = (req: any, res: any, next: any) => next();

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes per IP
 * Disabled in test environment to allow test suite to run
 */
export const loginRateLimiter = (req: any, res: any, next: any) => {
  if (isTestEnv()) {
    return noOpRateLimiter(req, res, next);
  }
  return actualLoginRateLimiter(req, res, next);
};

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per IP
 * Disabled in test environment to allow test suite to run
 */
const actualPasswordResetRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  message: 'Too many password reset requests, please try again later.',
  skipSuccessfulRequests: false, // Count all requests (even successful ones)
});

export const passwordResetRateLimiter = (req: any, res: any, next: any) => {
  if (isTestEnv()) {
    return noOpRateLimiter(req, res, next);
  }
  return actualPasswordResetRateLimiter(req, res, next);
};

/**
 * Rate limiter for email verification requests
 * 5 attempts per hour per IP
 * Disabled in test environment to allow test suite to run
 */
const actualEmailVerificationRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many verification attempts, please try again later.',
  skipSuccessfulRequests: false,
});

export const emailVerificationRateLimiter = (req: any, res: any, next: any) => {
  if (isTestEnv()) {
    return noOpRateLimiter(req, res, next);
  }
  return actualEmailVerificationRateLimiter(req, res, next);
};

/**
 * Rate limiter for general auth endpoints
 * 10 requests per 15 minutes per IP
 * Disabled in test environment to allow test suite to run
 */
const actualAuthRateLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
});

export const authRateLimiter = (req: any, res: any, next: any) => {
  if (isTestEnv()) {
    return noOpRateLimiter(req, res, next);
  }
  return actualAuthRateLimiter(req, res, next);
};
