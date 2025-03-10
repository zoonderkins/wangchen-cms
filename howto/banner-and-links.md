# 橫幅(Banner)和相關連結(Related Links)自定義指南

本文件說明如何在網站前端自定義橫幅輪播和相關連結區塊，包括數據獲取、前端渲染和自定義選項。

## 一、橫幅(Banner)輪播功能

### 控制器實作範例

```javascript
// 在您的控制器中 (例如 homeController.js)
exports.getHomePage = async (req, res) => {
  try {
    // 獲取當前語言
    const language = req.params.language || 'tw';
    
    // 獲取啟用的橫幅
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // 根據語言處理橫幅數據
    const processedBanners = banners.map(banner => {
      return {
        ...banner,
        title: language === 'tw' ? banner.title_tw : banner.title_en,
        description: language === 'tw' ? banner.description_tw : banner.description_en
      };
    });
    
    // 渲染首頁模板
    res.render('frontend/index', {
      title: language === 'tw' ? '首頁' : 'Home',
      banners: processedBanners,
      currentLanguage: language,
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('獲取首頁數據時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入首頁' });
  }
};
```

### EJS 模板實作範例

```ejs
<!-- 橫幅輪播區塊 -->
<div class="relative w-full h-[500px] overflow-hidden">
    <!-- 輪播內容 -->
    <div class="banner-container relative w-full h-full">
        <% banners.forEach((banner, index)=> { %>
            <div class="banner-slide absolute inset-0 w-full h-full"
                style="display: <%= index === 0 ? 'block' : 'none' %>;" data-index="<%= index %>">
                <% if (banner.mediaType==='image' ) { %>
                    <% if (banner.url) { %>
                        <a href="<%= banner.url %>" target="_blank" rel="noopener noreferrer"
                            class="block w-full h-full">
                            <img src="<%= banner.mediaPath %>" alt="<%= banner.title %>"
                                class="w-full h-full object-cover">
                        </a>
                    <% } else { %>
                        <img src="<%= banner.mediaPath %>" alt="<%= banner.title %>"
                            class="w-full h-full object-cover">
                    <% } %>
                <% } else if (banner.mediaType==='video' ) { %>
                    <video id="video-<%= index %>" autoplay muted loop playsinline
                        class="w-full h-full object-cover">
                        <source src="<%= banner.mediaPath %>" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                <% } %>
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                    <h2 class="text-xl font-bold"><%= banner.title %></h2>
                    <% if (banner.description) { %>
                        <p class="mt-2"><%= banner.description %></p>
                    <% } %>
                    <% if (banner.url && banner.mediaType !=='image' ) { %>
                        <a href="<%= banner.url %>" target="_blank" rel="noopener noreferrer"
                            class="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            <%= currentLanguage === 'tw' ? '了解更多' : 'Learn More' %>
                        </a>
                    <% } %>
                </div>
            </div>
        <% }); %>

        <% if (banners.length > 1) { %>
            <!-- 導航箭頭 -->
            <button class="banner-nav prev absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10 hover:bg-opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button class="banner-nav next absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10 hover:bg-opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            
            <!-- 指示點 -->
            <div class="absolute bottom-20 left-0 right-0 flex justify-center space-x-2 z-10">
                <% banners.forEach((_, index) => { %>
                    <button class="banner-dot w-3 h-3 rounded-full bg-white bg-opacity-50 hover:bg-opacity-100 <%= index === 0 ? 'bg-opacity-100' : '' %>" data-index="<%= index %>"></button>
                <% }); %>
            </div>
        <% } %>
    </div>
</div>

<!-- 輪播 JavaScript -->
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const slides = document.querySelectorAll('.banner-slide');
        const dots = document.querySelectorAll('.banner-dot');
        const prevBtn = document.querySelector('.banner-nav.prev');
        const nextBtn = document.querySelector('.banner-nav.next');
        let currentIndex = 0;
        const totalSlides = slides.length;
        
        // 自動輪播計時器
        let autoplayTimer;
        
        // 顯示指定索引的幻燈片
        function showSlide(index) {
            slides.forEach(slide => slide.style.display = 'none');
            dots.forEach(dot => dot.classList.remove('bg-opacity-100'));
            
            slides[index].style.display = 'block';
            dots[index].classList.add('bg-opacity-100');
            currentIndex = index;
            
            // 重置自動輪播計時器
            resetAutoplayTimer();
        }
        
        // 下一張幻燈片
        function nextSlide() {
            showSlide((currentIndex + 1) % totalSlides);
        }
        
        // 上一張幻燈片
        function prevSlide() {
            showSlide((currentIndex - 1 + totalSlides) % totalSlides);
        }
        
        // 設置自動輪播
        function startAutoplay() {
            autoplayTimer = setInterval(nextSlide, 5000); // 5秒切換一次
        }
        
        // 重置自動輪播計時器
        function resetAutoplayTimer() {
            clearInterval(autoplayTimer);
            startAutoplay();
        }
        
        // 綁定點擊事件
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', prevSlide);
            nextBtn.addEventListener('click', nextSlide);
        }
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => showSlide(index));
        });
        
        // 啟動自動輪播
        if (totalSlides > 1) {
            startAutoplay();
        }
    });
</script>
```

### 自定義選項

1. **橫幅數據結構**：
   ```javascript
   {
     id: 1,
     title_en: 'Welcome to Our Website',
     title_tw: '歡迎來到我們的網站',
     description_en: 'Discover our services and products',
     description_tw: '探索我們的服務和產品',
     mediaPath: '/uploads/banners/banner1.jpg',
     mediaType: 'image', // 'image' 或 'video'
     url: 'https://example.com',
     isActive: true,
     order: 1,
     createdAt: '2023-01-01T00:00:00Z',
     updatedAt: '2023-01-01T00:00:00Z',
     deletedAt: null
   }
   ```

2. **自定義選項**：
   - **輪播速度**：修改 `startAutoplay` 函數中的間隔時間（預設 5000 毫秒）
   - **輪播高度**：修改 `.h-[500px]` 類別中的高度值
   - **橫幅樣式**：修改 `.banner-slide` 的 CSS 樣式
   - **導航按鈕**：自定義 `.banner-nav` 的樣式和圖標
   - **指示點**：自定義 `.banner-dot` 的樣式和位置

3. **添加新功能**：
   - **滑動手勢**：添加觸控滑動支援
   - **鍵盤導航**：添加鍵盤左右鍵支援
   - **暫停自動輪播**：當滑鼠懸停時暫停自動輪播

## 二、相關連結(Related Links)功能

### 控制器實作範例

```javascript
// 在您的控制器中 (例如 homeController.js)
exports.getHomePage = async (req, res) => {
  try {
    // 獲取當前語言
    const language = req.params.language || 'tw';
    
    // 獲取啟用的相關連結
    const links = await prisma.relatedLink.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // 渲染首頁模板
    res.render('frontend/index', {
      title: language === 'tw' ? '首頁' : 'Home',
      links: links,
      currentLanguage: language,
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('獲取首頁數據時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入首頁' });
  }
};
```

### EJS 模板實作範例

```ejs
<!-- 相關連結區塊 -->
<% if (links && links.length > 0) { %>
    <div class="container mx-auto px-4 py-8 mb-12">
        <div class="max-w-6xl mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-center">
                <%= currentLanguage === 'en' ? 'Related Links' : '相關連結' %>
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <% links.forEach(function(link) { %>
                    <a href="<%= link.url %>" target="_blank" rel="noopener noreferrer" class="block group">
                        <div class="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                            <% if (link.image) { %>
                                <div class="h-40 overflow-hidden">
                                    <img src="<%= link.image %>"
                                        alt="<%= currentLanguage === 'en' ? link.title_en : link.title_tw %>"
                                        class="w-full h-full object-cover transition-transform duration-500 transform group-hover:scale-105">
                                </div>
                            <% } else { %>
                                <div class="h-40 bg-gray-200 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                        class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1">
                                        </path>
                                    </svg>
                                </div>
                            <% } %>
                            <div class="p-4">
                                <h3 class="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600">
                                    <%= currentLanguage === 'en' ? link.title_en : link.title_tw %>
                                </h3>
                                <div class="flex items-center text-gray-600 text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14">
                                        </path>
                                    </svg>
                                    <%= currentLanguage === 'en' ? 'Visit Link' : '訪問連結' %>
                                </div>
                            </div>
                        </div>
                    </a>
                <% }); %>
            </div>
        </div>
    </div>
<% } %>
```

### 自定義選項

1. **相關連結數據結構**：
   ```javascript
   {
     id: 1,
     title_en: 'Partner Website',
     title_tw: '合作夥伴網站',
     url: 'https://partner.example.com',
     image: '/uploads/links/partner.jpg',
     isActive: true,
     order: 1,
     createdAt: '2023-01-01T00:00:00Z',
     updatedAt: '2023-01-01T00:00:00Z',
     deletedAt: null
   }
   ```

2. **自定義選項**：
   - **網格佈局**：修改 `grid-cols-*` 類別以更改每行顯示的連結數量
   - **卡片高度**：修改 `.h-40` 類別以更改圖片高度
   - **懸停效果**：自定義 `hover:*` 類別以更改懸停效果
   - **圖標**：更換 SVG 圖標以使用不同的圖標
   - **卡片樣式**：修改 `.bg-white` 和 `.rounded-lg` 等類別以更改卡片外觀

3. **添加新功能**：
   - **分類**：按類別分組顯示相關連結
   - **描述**：添加連結描述文字
   - **標籤**：添加標籤以標識連結類型
   - **點擊追蹤**：添加點擊追蹤功能

## 三、資料庫模型設計

### Banner 模型

```javascript
// prisma/schema.prisma
model Banner {
  id            Int      @id @default(autoincrement())
  title_en      String
  title_tw      String
  description_en String?
  description_tw String?
  mediaPath     String
  mediaType     String   @default("image")
  url           String?
  isActive      Boolean  @default(true)
  order         Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}
```

### RelatedLink 模型

```javascript
// prisma/schema.prisma
model RelatedLink {
  id            Int      @id @default(autoincrement())
  title_en      String
  title_tw      String
  url           String
  image         String?
  isActive      Boolean  @default(true)
  order         Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}
```

## 四、管理介面實作建議

1. **橫幅管理**：
   - 創建、編輯、刪除橫幅
   - 上傳圖片或影片
   - 設置顯示順序
   - 啟用/停用橫幅
   - 多語言內容編輯

2. **相關連結管理**：
   - 創建、編輯、刪除連結
   - 上傳連結圖片
   - 設置顯示順序
   - 啟用/停用連結
   - 多語言標題編輯

## 五、最佳實踐

1. **圖片優化**：
   - 使用適當的圖片尺寸和格式
   - 實作懶加載以提高頁面載入速度
   - 考慮使用響應式圖片以適應不同設備

2. **多語言支援**：
   - 確保所有文本內容都有多語言版本
   - 使用語言切換功能讓用戶可以切換語言

3. **性能優化**：
   - 最小化 JavaScript 代碼
   - 使用 CSS 過渡而非 JavaScript 動畫
   - 優化圖片載入

4. **無障礙性**：
   - 添加適當的 ARIA 屬性
   - 確保鍵盤導航可用
   - 提供適當的替代文本 