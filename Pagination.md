# Pagination Specification

## Overview
This document outlines the pagination implementation across the frontend EJS templates in the Wangchen backend system. The pagination functionality is implemented consistently across multiple pages with some variations in parameter handling and styling.

## Common Pagination Features
- Page navigation with Previous/Next buttons
- Numbered page indicators
- Current page highlighting
- Proper handling of first/last page edge cases
- Preservation of search and filter parameters
- Multilingual support (English and Traditional Chinese)

## Implementation Details by Page

### 1. Articles Pagination (`articles.ejs`)
- **Implementation**: Standard pagination with Previous/Next buttons and page numbers
- **Variables Used**: `currentPage`, `totalPages`
- **URL Structure**: Uses `?page=X` format
- **Functionality**: 
  - Correctly shows/hides Previous button when on first page
  - Correctly shows/hides Next button when on last page
  - Highlights current page
  - Maintains proper page numbering

```html
<% if (totalPages > 1) { %>
    <div class="mt-8 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <% if (currentPage > 1) { %>
                <a href="?page=<%= currentPage - 1 %>" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Previous
                </a>
            <% } %>
            
            <% for(let i = 1; i <= totalPages; i++) { %>
                <a href="?page=<%= i %>" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium <%= currentPage === i ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50' %>">
                    <%= i %>
                </a>
            <% } %>
            
            <% if (currentPage < totalPages) { %>
                <a href="?page=<%= currentPage + 1 %>" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Next
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

### 2. News Pagination (`news.ejs`)
- **Implementation**: Similar to articles with Previous/Next buttons and page numbers
- **Variables Used**: `currentPage`, `totalPages`
- **URL Structure**: Uses `?page=X` format with search parameter preservation (`&search=`)
- **Functionality**:
  - Properly preserves search parameters when navigating pages
  - Handles multilingual UI (English/Traditional Chinese)
  - Correctly shows/hides navigation buttons

```html
<% if (totalPages > 1) { %>
    <div class="mt-8 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <% if (currentPage > 1) { %>
                <a href="?page=<%= currentPage - 1 %><%= search ? '&search=' + search : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <%= language==='tw' ? '上一頁' : 'Previous' %>
                </a>
            <% } %>
            
            <% for(let i=1; i <=totalPages; i++) { %>
                <a href="?page=<%= i %><%= search ? '&search=' + search : '' %>"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium <%= currentPage === i ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50' %>">
                    <%= i %>
                </a>
            <% } %>
            
            <% if (currentPage < totalPages) { %>
                <a href="?page=<%= currentPage + 1 %><%= search ? '&search=' + search : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <%= language==='tw' ? '下一頁' : 'Next' %>
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

### 3. Promotions Pagination (`promotions.ejs`)
- **Implementation**: More complex pagination with category and search filters
- **Variables Used**: `pagination.currentPage`, `pagination.totalPages`
- **URL Structure**: Uses `?page=X&category=Y&search=Z` format
- **Functionality**:
  - Preserves both category and search parameters when navigating
  - Uses proper URL encoding for search terms
  - Handles multilingual UI
  - Uses SVG icons for navigation buttons

```html
<% if (pagination && pagination.totalPages > 1) { %>
    <div class="mt-12 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <% if (pagination.currentPage > 1) { %>
                <a href="/<%= language %>/promotions?page=<%= pagination.currentPage - 1 %><%= selectedCategory ? `&category=${selectedCategory}` : '' %><%= currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only"><%= language==='en' ? 'Previous' : '上一頁' %></span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </a>
            <% } %>
            
            <% for(let i=1; i <=pagination.totalPages; i++) { %>
                <a href="/<%= language %>/promotions?page=<%= i %><%= selectedCategory ? `&category=${selectedCategory}` : '' %><%= currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '' %>"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium <%= pagination.currentPage === i ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50' %>">
                    <%= i %>
                </a>
            <% } %>
            
            <% if (pagination.currentPage < pagination.totalPages) { %>
                <a href="/<%= language %>/promotions?page=<%= pagination.currentPage + 1 %><%= selectedCategory ? `&category=${selectedCategory}` : '' %><%= currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only"><%= language==='en' ? 'Next' : '下一頁' %></span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

### 4. News Category Pagination (`news-category.ejs`)
- **Implementation**: Standard pagination within category view
- **Variables Used**: `currentPage`, `totalPages`
- **URL Structure**: Simple `?page=X` format
- **Functionality**:
  - Correctly maintains category context
  - Properly shows/hides navigation buttons

```html
<% if (totalPages > 1) { %>
    <div class="mt-8 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <% if (currentPage > 1) { %>
                <a href="?page=<%= currentPage - 1 %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <%= language==='tw' ? '上一頁' : 'Previous' %>
                </a>
            <% } %>
            
            <% for(let i=1; i <=totalPages; i++) { %>
                <a href="?page=<%= i %>"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium <%= currentPage === i ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50' %>">
                    <%= i %>
                </a>
            <% } %>
            
            <% if (currentPage < totalPages) { %>
                <a href="?page=<%= currentPage + 1 %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <%= language==='tw' ? '下一頁' : 'Next' %>
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

### 5. Downloads Pagination (`downloads.ejs`)
- **Implementation**: Most sophisticated pagination with multiple filters
- **Variables Used**: `pagination.current`, `pagination.totalPages`, `pagination.hasNextPage`, `pagination.hasPrevPage`
- **URL Structure**: Uses `?page=X&search=Y&category=Z` format
- **Functionality**:
  - Uses a different pagination object structure with boolean flags
  - Preserves all filter parameters
  - Has enhanced styling with gradient backgrounds
  - Properly handles empty states

```html
<% if (pagination.totalPages > 1) { %>
    <div class="mt-8">
        <nav class="flex justify-center" aria-label="Pagination">
            <ul class="inline-flex items-center -space-x-px">
                <% if (pagination.hasPrevPage) { %>
                    <li>
                        <a href="/<%= language %>/downloads?page=<%= pagination.current - 1 %><%= filters.search ? '&search=' + filters.search : '' %><%= filters.category ? '&category=' + filters.category : '' %>"
                            class="px-4 py-2 rounded-l-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition duration-150">
                            <i class="fas fa-chevron-left mr-1"></i>
                            <%= language === 'tw' ? '上一頁' : 'Previous' %>
                        </a>
                    </li>
                <% } %>
                
                <% for(let i=1; i <=pagination.totalPages; i++) { %>
                    <li>
                        <a href="/<%= language %>/downloads?page=<%= i %><%= filters.search ? '&search=' + filters.search : '' %><%= filters.category ? '&category=' + filters.category : '' %>"
                            class="px-4 py-2 text-sm font-medium <%= pagination.current === i ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50' %> border transition duration-150">
                            <%= i %>
                        </a>
                    </li>
                <% } %>
                
                <% if (pagination.hasNextPage) { %>
                    <li>
                        <a href="/<%= language %>/downloads?page=<%= pagination.current + 1 %><%= filters.search ? '&search=' + filters.search : '' %><%= filters.category ? '&category=' + filters.category : '' %>"
                            class="px-4 py-2 rounded-r-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition duration-150">
                            <%= language === 'tw' ? '下一頁' : 'Next' %>
                            <i class="fas fa-chevron-right ml-1"></i>
                        </a>
                    </li>
                <% } %>
            </ul>
        </nav>
    </div>
<% } %>
```

## Backend Implementation

The controllers implement pagination with the following pattern:

1. **Determine Page Parameters**:
   ```javascript
   const page = parseInt(req.query.page) || 1;
   const perPage = 12; // Items per page
   ```

2. **Calculate Skip/Take Values**:
   ```javascript
   const skip = (page - 1) * perPage;
   ```

3. **Count Total Items**:
   ```javascript
   const totalItems = await prisma.someModel.count({
       where: whereClause
   });
   ```

4. **Calculate Pagination Metadata**:
   ```javascript
   const totalPages = Math.ceil(totalItems / perPage);
   const hasNextPage = page < totalPages;
   const hasPrevPage = page > 1;
   ```

5. **Query with Pagination**:
   ```javascript
   const items = await prisma.someModel.findMany({
       where: whereClause,
       orderBy: { someField: 'desc' },
       skip,
       take: perPage,
       include: { /* related data */ }
   });
   ```

6. **Pass Pagination Data to Template**:
   ```javascript
   res.render('template', {
       items,
       pagination: {
           current: page,
           perPage,
           total: totalItems,
           totalPages,
           hasNextPage,
           hasPrevPage
       }
   });
   ```

## Recommendations for Improvement

1. **Standardize Variable Naming**: 
   - Some templates use `currentPage` while others use `pagination.current` or `pagination.currentPage`
   - Standardize to a single approach for better maintainability

2. **Create a Pagination Helper Function**:
   - Implement a helper function to standardize URL parameter handling
   - Example: `buildPaginationUrl(baseUrl, page, filters)`

3. **Implement Page Range Limiting**:
   - For pages with many pages, implement a range limiter (e.g., show only 5 pages around current)
   - Add ellipsis for skipped ranges

4. **Add Accessibility Improvements**:
   - Ensure all pagination controls have proper ARIA attributes
   - Add keyboard navigation support

## Conclusion

The pagination implementation across the frontend EJS files is working correctly. Each page properly handles page navigation, parameter preservation, first/last page edge cases, multilingual support, and visual indication of current page.

The backend controllers correctly implement the database queries with skip/take pagination and provide the necessary metadata to the templates. 