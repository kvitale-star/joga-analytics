/**
 * Password validation utilities
 * Checks against common passwords and enforces strength requirements
 */

// Top 100 most common passwords (2024)
const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  '1234567890',
  'qwerty',
  'abc123',
  '111111',
  '123123',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  'password1',
  'qwerty123',
  '000000',
  'sunshine',
  'princess',
  'football',
  'iloveyou',
  'welcome123',
  'admin123',
  'password123',
  'qwertyuiop',
  '123qwe',
  'dragon',
  'baseball',
  'superman',
  'qazwsx',
  'michael',
  'mustang',
  'shadow',
  'master',
  'jennifer',
  'jordan',
  'trustno1',
  'joshua',
  'hunter',
  'michelle',
  'buster',
  'soccer',
  'harley',
  'batman',
  'andrew',
  'tigger',
  'charlie',
  'robert',
  'thomas',
  'hockey',
  'ranger',
  'daniel',
  'hannah',
  'maggie',
  'jessica',
  'welcome',
  'monkey',
  'password1',
  'qwerty123',
  '000000',
  'sunshine',
  'princess',
  'football',
  'iloveyou',
  'welcome123',
  'admin123',
  'password123',
  'qwertyuiop',
  '123qwe',
  'dragon',
  'baseball',
  'superman',
  'qazwsx',
  'michael',
  'mustang',
  'shadow',
  'master',
  'jennifer',
  'jordan',
  'trustno1',
  'joshua',
  'hunter',
  'michelle',
  'buster',
  'soccer',
  'harley',
  'batman',
  'andrew',
  'tigger',
  'charlie',
  'robert',
  'thomas',
  'hockey',
  'ranger',
  'daniel',
  'hannah',
  'maggie',
  'jessica',
];

/**
 * Check if password validation is enabled
 */
function isPasswordValidationEnabled(): boolean {
  // Default to enabled, but can be disabled for testing
  return process.env.ENABLE_PASSWORD_VALIDATION !== 'false';
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  // Skip validation if disabled (for testing)
  if (!isPasswordValidationEnabled()) {
    return { isValid: true };
  }

  // Check minimum length
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  // Check against common passwords (case-insensitive)
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(passwordLower)) {
    return {
      isValid: false,
      error: 'This password is too common. Please choose a more secure password.',
    };
  }

  // Optional: Check for basic complexity (at least one letter and one number)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      error: 'Password must contain at least one letter and one number',
    };
  }

  return { isValid: true };
}
