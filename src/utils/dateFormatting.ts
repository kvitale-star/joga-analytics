/**
 * Date Formatting Utilities
 * 
 * Formats dates according to user preferences.
 * Supports MM/DD/YYYY, DD/MM/YYYY, and YYYY-MM-DD formats.
 */

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

/**
 * Format a date according to the specified format
 */
export function formatDate(date: Date, format: DateFormat = 'MM/DD/YYYY'): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format a date using user preferences
 * Falls back to MM/DD/YYYY if user or preference is not available
 */
export function formatDateWithUserPreference(
  date: Date,
  userPreferences?: Record<string, any>
): string {
  const dateFormat = (userPreferences?.dateFormat as DateFormat) || 'MM/DD/YYYY';
  return formatDate(date, dateFormat);
}

/**
 * Format a date with month name (e.g., "Jan 15, 2024")
 * Uses a consistent format since month name makes it unambiguous
 */
export function formatDateWithMonthName(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Convert a Date object to YYYY-MM-DD string format using local date methods
 * This avoids timezone conversion issues that occur with toISOString()
 * 
 * IMPORTANT: Use this instead of date.toISOString().split('T')[0] to prevent
 * dates from shifting by one day due to timezone conversion.
 */
export function dateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string into a Date object without timezone conversion
 * This prevents dates from shifting by one day when parsed from UTC strings
 * 
 * IMPORTANT: Use this instead of new Date(dateStr) when parsing YYYY-MM-DD strings
 * to avoid timezone conversion issues.
 */
export function parseYYYYMMDD(dateStr: string): Date {
  // If it's already in YYYY-MM-DD format, parse it manually to avoid timezone conversion
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(parts[3], 10);
      return new Date(year, month, day);
    }
  }
  
  // Fallback: try to parse as Date (may have timezone issues)
  return new Date(dateStr);
}

/**
 * Format a YYYY-MM-DD date string for display without timezone conversion
 * This prevents dates from shifting by one day when displayed
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param format - Output format (default: MM/DD/YYYY)
 * @returns Formatted date string
 */
export function formatDateString(dateStr: string | undefined | null, format: DateFormat = 'MM/DD/YYYY'): string {
  if (!dateStr) return '';
  
  // Parse the date string without timezone conversion
  const date = parseYYYYMMDD(dateStr);
  
  // Format using the specified format
  return formatDate(date, format);
}

/**
 * Format a YYYY-MM-DD date string using toLocaleDateString without timezone conversion
 * This prevents dates from shifting by one day when displayed
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Locale-formatted date string
 */
export function formatDateStringLocale(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  // Parse the date string without timezone conversion
  const date = parseYYYYMMDD(dateStr);
  
  // Use toLocaleDateString for locale-aware formatting
  return date.toLocaleDateString();
}
