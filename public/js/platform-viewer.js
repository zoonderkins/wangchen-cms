/**
 * Client-side platform content loader
 * This script looks for platform placeholders in the page and replaces them with actual content
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all platform placeholders in the content
  const regex = /\[PLATFORM:(\d+):([a-z]{2})\]/g;
  const content = document.querySelector('.quill-content');
  
  if (!content) return;
  
  // Get current language from URL
  const language = window.location.pathname.includes('/en/') ? 'en' : 'tw';
  
  // Replace all platform placeholders with loading indicators
  let html = content.innerHTML;
  const platformIds = [];
  const platformMatches = [];
  
  // Collect all platform references
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [fullMatch, id, lang] = match;
    platformIds.push(id);
    platformMatches.push({
      fullMatch,
      id,
      lang: lang || language
    });
  }
  
  // If no platforms found, exit
  if (platformMatches.length === 0) return;
  
  // Replace placeholders with loading indicators
  platformMatches.forEach(match => {
    const loadingHtml = `
      <div class="platform-embed-container" data-platform-id="${match.id}" data-platform-lang="${match.lang}">
        <div class="platform-embed-item">
          <div class="platform-embed-header">
            <h4>Loading platform content...</h4>
          </div>
          <div class="platform-embed-body">
            <p>Loading content from platform #${match.id}...</p>
          </div>
        </div>
      </div>
    `;
    html = html.replace(match.fullMatch, loadingHtml);
  });
  
  // Update the content with loading indicators
  content.innerHTML = html;
  
  // Fetch platform data for each unique ID
  const uniqueIds = [...new Set(platformIds)];
  
  uniqueIds.forEach(id => {
    fetch(`/api/platforms/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Platform not found');
        }
        return response.json();
      })
      .then(data => {
        if (!data.success || !data.data) {
          throw new Error('Invalid platform data');
        }
        
        // Update all placeholders with this ID
        const containers = document.querySelectorAll(`.platform-embed-container[data-platform-id="${id}"]`);
        
        containers.forEach(container => {
          const lang = container.getAttribute('data-platform-lang') || language;
          const platform = data.data;
          
          const title = lang === 'en' ? platform.title_en : platform.title_tw;
          const content = lang === 'en' ? platform.content_en : platform.content_tw;
          const category = platform.category ? 
            (lang === 'en' ? platform.category.name_en : platform.category.name_tw) : null;
          
          container.innerHTML = `
            <div class="platform-embed-item">
              <div class="platform-embed-header">
                <h4>${title}</h4>
                ${category ? `<div class="platform-embed-category">${category}</div>` : ''}
              </div>
              <div class="platform-embed-body">
                ${content || ''}
              </div>
              ${platform.imagePath ? `
                <div class="platform-embed-image">
                  <img src="/${platform.imagePath}" alt="${title}">
                </div>
              ` : ''}
            </div>
          `;
        });
      })
      .catch(error => {
        // Update placeholders with error message
        const containers = document.querySelectorAll(`.platform-embed-container[data-platform-id="${id}"]`);
        
        containers.forEach(container => {
          container.innerHTML = `
            <div class="platform-embed-error">
              <div class="platform-embed-error-icon">⚠️</div>
              <div class="platform-embed-error-message">
                Platform item #${id} not found or not available
              </div>
            </div>
          `;
        });
        
        console.error(`Error loading platform ${id}:`, error);
      });
  });
}); 