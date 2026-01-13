/**
 * Utilities for detecting and processing image URLs from Google Sheets
 */

/**
 * Checks if a string is a valid image URL
 */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  if (!trimmed) return false;
  
  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
  if (imageExtensions.test(trimmed)) return true;
  
  // Check for image hosting services
  const imageHosts = [
    'imgur.com',
    'imgbb.com',
    'cloudinary.com',
    'unsplash.com',
    'pexels.com',
    'drive.google.com/file',
    'photos.google.com',
    'i.imgur.com',
  ];
  
  try {
    const urlObj = new URL(trimmed);
    return imageHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    // Not a valid URL, might be a Google Drive file ID
    return false;
  }
}

/**
 * Converts Google Drive sharing links to direct image URLs
 * Handles formats like:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 */
export function convertGoogleDriveUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Extract file ID from various Google Drive URL formats
    let fileId: string | null = null;
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    
    // Format: https://drive.google.com/open?id=FILE_ID
    if (!fileId) {
      const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }
    }
    
    // Format: Just the file ID itself
    if (!fileId && /^[a-zA-Z0-9_-]+$/.test(url.trim())) {
      fileId = url.trim();
    }
    
    if (fileId) {
      // Convert to direct image URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  } catch (error) {
    console.warn('Error converting Google Drive URL:', error);
  }
  
  return null;
}

/**
 * Gets all image URLs from a match data object
 */
export function extractImageUrls(match: Record<string, any>): string[] {
  const imageUrls: string[] = [];
  
  Object.values(match).forEach(value => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Check if it's a direct image URL
      if (isImageUrl(trimmed)) {
        imageUrls.push(trimmed);
      } else {
        // Try converting Google Drive URL
        const converted = convertGoogleDriveUrl(trimmed);
        if (converted) {
          imageUrls.push(converted);
        }
      }
    }
  });
  
  return imageUrls;
}

/**
 * Finds columns that contain image URLs
 */
export function findImageColumns(matchData: Record<string, any>[]): string[] {
  if (matchData.length === 0) return [];
  
  const imageColumns = new Set<string>();
  
  matchData.forEach(match => {
    Object.entries(match).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (isImageUrl(trimmed) || convertGoogleDriveUrl(trimmed)) {
          imageColumns.add(key);
        }
      }
    });
  });
  
  return Array.from(imageColumns);
}

