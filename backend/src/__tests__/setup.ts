// Test setup file
// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Ensure password validation is enabled in tests (we want to test it!)
if (!process.env.ENABLE_PASSWORD_VALIDATION) {
  process.env.ENABLE_PASSWORD_VALIDATION = 'true';
}
