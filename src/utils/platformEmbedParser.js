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
    // Regular expression to match platform embeds
    // Matches: <div class="platform-embed-container" data-platform-id="123">...</div>
    const regex = /<div[^>]*class="platform-embed-container"[^>]*data-platform-id="(\d+)"[^>]*>.*?<\/div>/gs;
    
    // Find all platform embeds in the content
    const matches = [...content.matchAll(regex)];
    
    if (matches.length === 0) {
      return content;
    }
    
    // Get all platform IDs
    const platformIds = matches.map(match => parseInt(match[1], 10)).filter(id => !isNaN(id));
    
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
    for (const match of matches) {
      const fullMatch = match[0];
      const platformId = parseInt(match[1], 10);
      
      if (isNaN(platformId)) continue;
      
      const platform = platformMap[platformId];
      
      if (!platform) {
        // Platform not found, replace with error message
        const errorHtml = `
          <div class="platform-embed-error">
            <div class="platform-embed-error-icon">⚠️</div>
            <div class="platform-embed-error-message">
              Platform item #${platformId} not found or not available
            </div>
          </div>
        `;
        result = result.replace(fullMatch, errorHtml);
        continue;
      }
      
      // Get content based on language
      const title = language === 'en' ? platform.title_en : platform.title_tw;
      const content = language === 'en' ? platform.content_en : platform.content_tw;
      
      // Create HTML for the platform
      const platformHtml = `
        <div class="platform-embed-container">
          <div class="platform-embed-item">
            <div class="platform-embed-header">
              <h4>${title}</h4>
              ${platform.category ? 
                `<div class="platform-embed-category">${language === 'en' ? platform.category.name_en : platform.category.name_tw}</div>` : 
                ''}
            </div>
            <div class="platform-embed-body">
              ${content || ''}
            </div>
            ${platform.imagePath ? `
              <div class="platform-embed-image">
                <img src="${platform.imagePath}" alt="${title}">
              </div>
            ` : ''}
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
