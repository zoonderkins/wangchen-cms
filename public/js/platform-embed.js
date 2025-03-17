/**
 * Platform Embed Module for Quill.js
 * Allows embedding platform items in Quill editor
 */

(function() {
  // Define custom blot for platform embeds
  if (window.Quill) {
    const BlockEmbed = Quill.import('blots/block/embed');
    
    class PlatformEmbedBlot extends BlockEmbed {
      static create(value) {
        const node = super.create();
        node.setAttribute('data-platform-id', value.id);
        node.setAttribute('contenteditable', false);
        node.classList.add('platform-embed');
        
        // Create the embed content
        const embedContent = document.createElement('div');
        embedContent.classList.add('platform-embed-content');
        
        // Add a placeholder until the actual content is loaded
        const placeholder = document.createElement('div');
        placeholder.classList.add('platform-embed-placeholder');
        placeholder.innerHTML = `
          <div class="platform-embed-loading">
            <div class="spinner"></div>
            <div>Loading platform item #${value.id}...</div>
          </div>
        `;
        embedContent.appendChild(placeholder);
        
        node.appendChild(embedContent);
        
        // Load the platform item data
        loadPlatformItem(value.id, embedContent);
        
        return node;
      }
      
      static value(node) {
        return {
          id: node.getAttribute('data-platform-id')
        };
      }
    }
    
    PlatformEmbedBlot.blotName = 'platform-embed';
    PlatformEmbedBlot.tagName = 'div';
    PlatformEmbedBlot.className = 'platform-embed-container';
    
    Quill.register(PlatformEmbedBlot);
    
    // Add toolbar button for platform embed
    const platformEmbedHandler = function() {
      const quill = this.quill;
      const range = quill.getSelection();
      
      // Create a modal for selecting a platform item
      const modal = document.createElement('div');
      modal.classList.add('platform-embed-modal');
      modal.innerHTML = `
        <div class="platform-embed-modal-content">
          <div class="platform-embed-modal-header">
            <h3>Embed Platform Item</h3>
            <button type="button" class="platform-embed-modal-close">&times;</button>
          </div>
          <div class="platform-embed-modal-body">
            <div class="platform-embed-form">
              <div class="form-group">
                <label for="platform-id">Platform Item ID</label>
                <input type="number" id="platform-id" class="form-control" placeholder="Enter platform item ID">
              </div>
            </div>
          </div>
          <div class="platform-embed-modal-footer">
            <button type="button" class="btn btn-secondary platform-embed-modal-cancel">Cancel</button>
            <button type="button" class="btn btn-primary platform-embed-modal-insert">Insert</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Handle modal close
      const closeModal = function() {
        document.body.removeChild(modal);
      };
      
      // Handle modal events
      modal.querySelector('.platform-embed-modal-close').addEventListener('click', closeModal);
      modal.querySelector('.platform-embed-modal-cancel').addEventListener('click', closeModal);
      
      // Handle insert button
      modal.querySelector('.platform-embed-modal-insert').addEventListener('click', function() {
        const platformId = document.getElementById('platform-id').value;
        
        if (platformId) {
          // Insert the platform embed at the current cursor position
          quill.insertEmbed(range.index, 'platform-embed', { id: platformId }, Quill.sources.USER);
          // Move cursor after the embed
          quill.setSelection(range.index + 1, 0, Quill.sources.SILENT);
        }
        
        closeModal();
      });
      
      // Focus the input field
      setTimeout(() => {
        document.getElementById('platform-id').focus();
      }, 0);
    };
    
    // Function to load platform item data
    function loadPlatformItem(id, container) {
      fetch(`/api/platforms/${id}`)
        .then(response => response.json())
        .then(result => {
          if (result.success && result.data) {
            const item = result.data;
            const language = document.documentElement.lang || 'en';
            const title = language === 'en' ? item.title_en : item.title_tw;
            const content = language === 'en' ? item.content_en : item.content_tw;
            
            // Create the platform item display
            container.innerHTML = `
              <div class="platform-embed-item">
                <div class="platform-embed-header">
                  <h4>${title}</h4>
                  <div class="platform-embed-badge">Platform #${id}</div>
                </div>
                <div class="platform-embed-body">
                  ${content || ''}
                </div>
                ${item.imagePath ? `
                  <div class="platform-embed-image">
                    <img src="${item.imagePath}" alt="${title}">
                  </div>
                ` : ''}
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="platform-embed-error">
                <div class="platform-embed-error-icon">⚠️</div>
                <div class="platform-embed-error-message">
                  Platform item #${id} not found or not available
                </div>
              </div>
            `;
          }
        })
        .catch(error => {
          console.error('Error loading platform item:', error);
          container.innerHTML = `
            <div class="platform-embed-error">
              <div class="platform-embed-error-icon">⚠️</div>
              <div class="platform-embed-error-message">
                Error loading platform item #${id}
              </div>
            </div>
          `;
        });
    }
    
    // Add CSS styles for platform embeds
    const style = document.createElement('style');
    style.textContent = `
      .platform-embed-container {
        margin: 1rem 0;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        overflow: hidden;
        background-color: #f8fafc;
      }
      
      .platform-embed-placeholder {
        padding: 2rem;
        text-align: center;
        color: #64748b;
      }
      
      .platform-embed-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      
      .platform-embed-loading .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #e2e8f0;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .platform-embed-item {
        display: flex;
        flex-direction: column;
      }
      
      .platform-embed-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background-color: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .platform-embed-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #334155;
      }
      
      .platform-embed-badge {
        font-size: 0.75rem;
        font-weight: 500;
        color: #6366f1;
        background-color: #eef2ff;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
      }
      
      .platform-embed-body {
        padding: 1rem;
        color: #334155;
      }
      
      .platform-embed-image {
        padding: 0 1rem 1rem;
      }
      
      .platform-embed-image img {
        max-width: 100%;
        height: auto;
        border-radius: 0.25rem;
      }
      
      .platform-embed-error {
        padding: 1.5rem;
        text-align: center;
        color: #ef4444;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      
      .platform-embed-error-icon {
        font-size: 1.5rem;
      }
      
      .platform-embed-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      .platform-embed-modal-content {
        background-color: white;
        border-radius: 0.5rem;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      
      .platform-embed-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .platform-embed-modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .platform-embed-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #64748b;
      }
      
      .platform-embed-modal-body {
        padding: 1rem;
      }
      
      .platform-embed-modal-footer {
        padding: 1rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      
      .platform-embed-form .form-group {
        margin-bottom: 1rem;
      }
      
      .platform-embed-form label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      
      .platform-embed-form .form-control {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
      }
      
      .platform-embed-form .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        font-weight: 500;
        cursor: pointer;
      }
      
      .platform-embed-form .btn-primary {
        background-color: #6366f1;
        color: white;
        border: none;
      }
      
      .platform-embed-form .btn-secondary {
        background-color: #e2e8f0;
        color: #334155;
        border: none;
      }
    `;
    document.head.appendChild(style);
    
    // Add the platform embed button to Quill toolbar
    window.platformEmbedHandler = platformEmbedHandler;
  }
})(); 