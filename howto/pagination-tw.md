# 分頁功能實作說明

本文件說明如何在網站前端實作分頁功能，適用於文章列表、新聞、促銷活動等需要分頁顯示的頁面。

## 分頁功能概述

分頁功能可讓您將大量內容分散在多個頁面上顯示，提升使用者體驗和網站效能。主要特點包括：

- 上一頁/下一頁導航按鈕
- 頁碼指示器
- 當前頁面高亮顯示
- 正確處理第一頁/最後一頁的邊界情況
- 保留搜尋和篩選參數
- 多語言支援（英文和繁體中文）

## 控制器實作範例

以下是在控制器中實作分頁的範例程式碼：

```javascript
// 在您的控制器中 (例如 articleController.js)
exports.listArticles = async (req, res) => {
  try {
    // 取得分頁參數
    const page = parseInt(req.query.page) || 1;
    const perPage = 12; // 每頁顯示的項目數量
    
    // 計算資料庫查詢的跳過值
    const skip = (page - 1) * perPage;
    
    // 取得總文章數量用於分頁計算
    const totalArticles = await prisma.article.count({
      where: {
        deletedAt: null,
        published: true
      }
    });
    
    // 計算總頁數
    const totalPages = Math.ceil(totalArticles / perPage);
    
    // 使用分頁參數取得文章
    const articles = await prisma.article.findMany({
      where: {
        deletedAt: null,
        published: true
      },
      include: {
        category: true,
        author: {
          select: {
            username: true
          }
        },
        featuredImageMedia: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: skip,
      take: perPage
    });
    
    // 渲染模板並傳遞資料
    res.render('frontend/articles', {
      title: '文章列表',
      articles: articles,
      currentPage: page,
      totalPages: totalPages,
      language: 'tw',
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('取得文章時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入文章' });
  }
};
```

## EJS 模板實作範例

以下是在 EJS 模板中實作分頁的範例程式碼：

```ejs
<!-- 分頁控制區 -->
<% if (totalPages > 1) { %>
    <div class="mt-8 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="分頁">
            <% if (currentPage > 1) { %>
                <a href="?page=<%= currentPage - 1 %><%= search ? '&search=' + search : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    上一頁
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
                    下一頁
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

## 帶有搜尋和分類篩選的分頁範例

以下是包含搜尋和分類篩選的分頁範例：

```ejs
<!-- 帶有搜尋和分類篩選的分頁 -->
<% if (pagination && pagination.totalPages > 1) { %>
    <div class="mt-12 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="分頁">
            <% if (pagination.currentPage > 1) { %>
                <a href="/<%= language %>/promotions?page=<%= pagination.currentPage - 1 %><%= selectedCategory ? `&category=${selectedCategory}` : '' %><%= currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '' %>"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only">上一頁</span>
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
                    <span class="sr-only">下一頁</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </a>
            <% } %>
        </nav>
    </div>
<% } %>
```

## 路由配置

```javascript
// 在您的路由文件中 (例如 routes/frontend.js)
const articleController = require('../controllers/articleController');

router.get('/articles', articleController.listArticles);
```

## 實作要點

1. **控制器處理**：
   - 使用 `skip` 和 `take` 參數實現資料庫分頁查詢
   - 計算總頁數以顯示正確的分頁控制項
   - 將分頁資訊傳遞給模板

2. **模板處理**：
   - 只有在總頁數大於 1 時才顯示分頁控制項
   - 高亮顯示當前頁碼
   - 在第一頁時隱藏「上一頁」按鈕
   - 在最後一頁時隱藏「下一頁」按鈕
   - 保留搜尋和篩選參數

3. **URL 參數處理**：
   - 使用 `?page=X` 格式進行基本分頁
   - 使用 `&search=Y` 保留搜尋參數
   - 使用 `&category=Z` 保留分類篩選參數
   - 對搜尋參數進行 URL 編碼以處理特殊字符

## 改進建議

1. **標準化變數命名**：
   - 統一使用 `currentPage` 或 `pagination.current` 作為當前頁碼
   - 統一使用 `totalPages` 或 `pagination.totalPages` 作為總頁數

2. **創建分頁輔助函數**：
   - 實作一個輔助函數來標準化 URL 參數處理
   - 例如：`buildPaginationUrl(baseUrl, page, filters)`

3. **實作頁碼範圍限制**：
   - 對於頁數較多的情況，限制顯示範圍（例如，只顯示當前頁面周圍的 5 頁）
   - 使用省略號表示跳過的範圍

4. **提升無障礙性**：
   - 確保所有分頁控制項都有適當的 ARIA 屬性
   - 添加鍵盤導航支援 