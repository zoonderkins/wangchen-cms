const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * Parse HTML content and replace platform embeds with actual platform content
 * @param {string} content - HTML content that may contain platform embeds
 * @param {string} language - Current language (en or tw)
 * @returns {Promise<string>} - HTML content with platform embeds replaced
 */
async function parsePlatformEmbeds(content, language = 'en') {
  if (!content) return '';
  
  try {
    // Regular expressions to match platform embeds
    // Legacy format: <div class="platform-embed-container" data-platform-id="123">...</div>
    const legacyRegex = /<div[^>]*class="platform-embed-container"[^>]*data-platform-id="(\d+)"[^>]*>.*?<\/div>/gs;
    // Text placeholder format: [PLATFORM:123:en]
    const placeholderRegex = /\[PLATFORM:(\d+):([a-z]{2})\]/g;
    // Simple format: [Platform: 123]
    const simpleRegex = /\[Platform:\s*(\d+)\]/gi;
    
    // First check for legacy format
    let matches = [...content.matchAll(legacyRegex)];
    const legacyMatches = matches.map(match => ({
      fullMatch: match[0],
      platformId: parseInt(match[1], 10),
      language: null // Will use the provided language parameter
    }));
    
    // Then check for new format
    matches = [...content.matchAll(placeholderRegex)];
    const newMatches = matches.map(match => ({
      fullMatch: match[0],
      platformId: parseInt(match[1], 10),
      language: match[2] // Language specified in the embed
    }));
    
    // Then check for simple format
    matches = [...content.matchAll(simpleRegex)];
    const simpleMatches = matches.map(match => ({
      fullMatch: match[0],
      platformId: parseInt(match[1], 10),
      language: null // Will use the provided language parameter
    }));
    
    // Combine all matches
    const allMatches = [...legacyMatches, ...newMatches, ...simpleMatches];
    
    if (allMatches.length === 0) {
      return content;
    }
    
    // Get all platform IDs
    const platformIds = allMatches.map(match => match.platformId).filter(id => !isNaN(id));
    
    if (platformIds.length === 0) {
      return content;
    }
    
    // Fetch all platforms in one query
    const platforms = await prisma.platform.findMany({
      where: {
        id: { in: platformIds },
        deletedAt: null,
        status: 'published'
      },
      include: {
        category: {
          select: {
            name_en: true,
            name_tw: true
          }
        }
      }
    });
    
    // Create a map for quick lookup
    const platformMap = {};
    platforms.forEach(platform => {
      platformMap[platform.id] = platform;
    });
    
    // Replace each platform embed with actual content
    let result = content;
    for (const match of allMatches) {
      const fullMatch = match.fullMatch;
      const platformId = match.platformId;
      
      if (isNaN(platformId)) continue;
      
      const platform = platformMap[platformId];
      
      if (!platform) {
        // Platform not found, replace with error message
        const errorHtml = `
          <div class="prose max-w-none quill-content">
            <div class="ql-container ql-snow" style="border: none;">
              <div class="ql-editor">
                <p>Platform item #${platformId} not found or not available</p>
              </div>
            </div>
          </div>
        `;
        result = result.replace(fullMatch, errorHtml);
        continue;
      }
      
      // Get content based on language (use match.language if specified, otherwise use the provided language parameter)
      const embedLanguage = match.language || language;
      const title = embedLanguage === 'en' ? platform.title_en : platform.title_tw;
      const content = embedLanguage === 'en' ? platform.content_en : platform.content_tw;
      
      // Create HTML for the platform
      const platformHtml = `
        <div class="prose max-w-none quill-content">
          <div class="ql-container ql-snow" style="border: none;">
            <div class="ql-editor">
              ${content || ''}
              ${platform.imagePath ? `<img src="${platform.imagePath}" alt="${title}" style="max-width: 100%; height: auto;">` : ''}
            </div>
          </div>
        </div>
      `;
      
      // Replace the match with the platform HTML
      result = result.replace(fullMatch, platformHtml);
    }
    
    return result;
  } catch (error) {
    logger.error('Error parsing platform embeds:', error);
    return content;
  }
}

module.exports = { parsePlatformEmbeds };