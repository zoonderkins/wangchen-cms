# 前端組件自定義指南：聯絡表單、下載區和常見問題

本文件說明如何自定義網站前端的三個重要組件：聯絡表單(Contact Form)、下載區(Downloads)和常見問題(FAQ)。

## 一、聯絡表單 (Contact Form)

聯絡表單允許用戶向網站管理員發送訊息，是網站與用戶互動的重要渠道。

### 控制器實作範例

```javascript
// 在您的控制器中 (例如 contactController.js)
// 顯示聯絡表單
exports.showContactForm = async (req, res) => {
  try {
    // 獲取當前語言
    const language = req.params.language || 'tw';
    
    // 獲取聯絡表單類別
    const categories = await prisma.contactCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // 渲染聯絡表單頁面
    res.render('frontend/contact', {
      title: language === 'tw' ? '聯絡我們' : 'Contact Us',
      categories: categories,
      currentLanguage: language,
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('獲取聯絡表單頁面時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入聯絡表單' });
  }
};

// 處理聯絡表單提交
exports.submitContactForm = async (req, res) => {
  try {
    const language = req.params.language || 'tw';
    const { name, email, company, phone, categoryId, message, agreeTerms } = req.body;
    
    // 驗證必填欄位
    if (!name || !email || !message) {
      // 獲取類別以重新渲染表單
      const categories = await prisma.contactCategory.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          order: 'asc'
        }
      });
      
      return res.render('frontend/contact', {
        title: language === 'tw' ? '聯絡我們' : 'Contact Us',
        error: language === 'tw' ? '請填寫所有必填欄位' : 'Please fill in all required fields',
        formData: req.body,
        categories: categories,
        currentLanguage: language,
        layout: 'layouts/frontend'
      });
    }
    
    // 創建聯絡記錄
    await prisma.contact.create({
      data: {
        name,
        email,
        company: company || null,
        phone: phone || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        message,
        status: 'pending',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    // 重定向到成功頁面
    res.redirect(`/${language}/contact/success`);
  } catch (error) {
    console.error('提交聯絡表單時發生錯誤:', error);
    res.status(500).render('error', { message: '無法提交表單' });
  }
};
```

### EJS 模板自定義

聯絡表單的 EJS 模板包含以下主要部分：

1. **表單標題和錯誤訊息區域**
2. **個人資訊欄位**（姓名、電子郵件、公司、電話）
3. **類別下拉選單**
4. **訊息文本區域**
5. **條款同意複選框**
6. **提交按鈕**

```ejs
<!-- 自定義表單標題 -->
<h1 class="text-3xl font-bold mb-6 text-center">
  <%= currentLanguage==='en' ? 'Contact Us' : '聯絡我們' %>
</h1>

<!-- 自定義表單外觀 -->
<div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
  <form action="/<%= currentLanguage %>/contact" method="POST">
    <!-- 自定義表單欄位佈局 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <!-- 姓名欄位 -->
      <div>
        <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
          <%= currentLanguage==='en' ? 'Name' : '姓名' %> <span class="text-red-500">*</span>
        </label>
        <input
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="name" name="name" type="text"
          value="<%= typeof formData !== 'undefined' ? formData.name || '' : '' %>" required>
      </div>
      
      <!-- 電子郵件欄位 -->
      <div>
        <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
          <%= currentLanguage==='en' ? 'Email' : '電子郵件' %> <span class="text-red-500">*</span>
        </label>
        <input
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="email" name="email" type="email"
          value="<%= typeof formData !== 'undefined' ? formData.email || '' : '' %>" required>
      </div>
    </div>
    
    <!-- 自定義提交按鈕 -->
    <div class="flex items-center justify-center">
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
        type="submit">
        <%= currentLanguage==='en' ? 'Submit' : '提交' %>
      </button>
    </div>
  </form>
</div>
```

### 自定義選項

1. **表單欄位**：
   - 添加或移除欄位
   - 更改欄位的必填狀態
   - 添加自定義驗證規則

2. **表單佈局**：
   - 修改 `grid-cols-*` 類別以更改欄位排列方式
   - 調整間距和邊距
   - 更改表單容器的樣式

3. **表單樣式**：
   - 修改輸入框、標籤和按鈕的樣式
   - 自定義錯誤訊息的顯示方式
   - 更改表單背景和陰影效果

4. **表單行為**：
   - 添加 JavaScript 表單驗證
   - 實現 AJAX 表單提交
   - 添加 reCAPTCHA 防止垃圾郵件

## 二、下載區 (Downloads)

下載區允許用戶瀏覽和下載網站提供的文件，如產品手冊、技術文檔等。

### 控制器實作範例

```javascript
// 在您的控制器中 (例如 downloadController.js)
exports.getDownloads = async (req, res) => {
  try {
    // 獲取當前語言和分頁參數
    const language = req.params.language || 'tw';
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;
    
    // 獲取搜尋和分類篩選參數
    const search = req.query.search || '';
    const category = req.query.category || '';
    
    // 構建查詢條件
    const whereConditions = {
      isActive: true,
      deletedAt: null,
      ...(search ? {
        OR: [
          { title_en: { contains: search } },
          { title_tw: { contains: search } },
          { description_en: { contains: search } },
          { description_tw: { contains: search } },
          { keywords_en: { contains: search } },
          { keywords_tw: { contains: search } }
        ]
      } : {}),
      ...(category ? { categoryId: parseInt(category) } : {})
    };
    
    // 獲取下載項目和總數
    const [downloads, totalCount] = await Promise.all([
      prisma.download.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        include: {
          category: true
        }
      }),
      prisma.download.count({
        where: whereConditions
      })
    ]);
    
    // 獲取所有分類
    const categories = await prisma.downloadCategory.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' }
    });
    
    // 處理多語言內容
    const processedDownloads = downloads.map(download => {
      const titleField = `title_${language}`;
      const descriptionField = `description_${language}`;
      
      return {
        ...download,
        title: download[titleField] || download.title_en,
        description: download[descriptionField] || download.description_en
      };
    });
    
    const processedCategories = categories.map(category => {
      const nameField = `name_${language}`;
      
      return {
        ...category,
        name: category[nameField] || category.name_en
      };
    });
    
    // 計算分頁資訊
    const totalPages = Math.ceil(totalCount / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // 渲染下載頁面
    res.render('frontend/downloads', {
      title: language === 'tw' ? '下載專區' : 'Downloads',
      downloads: processedDownloads,
      categories: processedCategories,
      language,
      filters: {
        search: search || '',
        category: category || ''
      },
      pagination: {
        current: page,
        perPage,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('獲取下載頁面時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入下載頁面' });
  }
};
```

### EJS 模板自定義

下載區的 EJS 模板包含以下主要部分：

1. **頁面標題和說明**
2. **搜尋和篩選區域**
3. **下載項目網格**
4. **分頁控制項**
5. **空狀態顯示**

```ejs
<!-- 自定義頁面標題和說明 -->
<div class="text-center mb-12 animate-fade-in">
  <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
    <%= language === 'tw' ? '下載專區' : 'Downloads' %>
  </h1>
  <p class="text-lg text-gray-600">
    <%= language === 'tw' ? '瀏覽並下載我們的資源' : 'Browse and download our resources' %>
  </p>
</div>

<!-- 自定義搜尋和篩選區域 -->
<div class="bg-white rounded-xl shadow-sm p-6 mb-8 backdrop-blur-sm bg-white/80">
  <!-- 搜尋表單 -->
  <!-- 分類篩選 -->
</div>

<!-- 自定義下載項目網格 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <% downloads.forEach(function(download) { %>
    <!-- 下載項目卡片 -->
    <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <!-- 卡片內容 -->
    </div>
  <% }); %>
</div>

<!-- 自定義分頁控制項 -->
<% if (pagination.totalPages > 1) { %>
  <div class="mt-8">
    <nav class="flex justify-center" aria-label="Pagination">
      <!-- 分頁控制項 -->
    </nav>
  </div>
<% } %>

<!-- 自定義空狀態顯示 -->
<% if (!(locals.downloads && downloads.length > 0)) { %>
  <div class="text-center py-16">
    <!-- 空狀態內容 -->
  </div>
<% } %>
```

### 自定義選項

1. **頁面樣式**：
   - 修改頁面標題的漸變色彩
   - 自定義動畫效果
   - 更改整體佈局和間距

2. **搜尋和篩選**：
   - 添加更多篩選選項（如日期、大小等）
   - 自定義搜尋框和下拉選單的外觀
   - 實現即時搜尋功能

3. **下載卡片**：
   - 修改卡片佈局和樣式
   - 自定義文件類型圖標
   - 添加更多文件信息（如上傳日期、下載次數等）

4. **分頁控制項**：
   - 自定義分頁按鈕的外觀
   - 修改分頁邏輯（如顯示頁碼範圍）
   - 添加跳轉到特定頁面的功能

5. **空狀態**：
   - 自定義空狀態的圖標和訊息
   - 添加建議或相關連結

## 三、常見問題 (FAQ)

常見問題頁面提供用戶可能遇到的問題和解答，幫助減少客服負擔。

### 控制器實作範例

```javascript
// 在您的控制器中 (例如 faqController.js)
exports.getFaqPage = async (req, res) => {
  try {
    // 獲取當前語言
    const language = req.params.language || 'tw';
    
    // 獲取所有 FAQ 類別及其項目
    const categories = await prisma.faqCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        faqItems: {
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // 渲染 FAQ 頁面
    res.render('frontend/faq', {
      title: language === 'tw' ? '常見問題' : 'Frequently Asked Questions',
      categories: categories,
      currentLanguage: language,
      layout: 'layouts/frontend'
    });
  } catch (error) {
    console.error('獲取 FAQ 頁面時發生錯誤:', error);
    res.status(500).render('error', { message: '無法載入常見問題頁面' });
  }
};
```

### EJS 模板自定義

FAQ 頁面的 EJS 模板包含以下主要部分：

1. **頁面標題**
2. **類別標籤**
3. **問答列表**
4. **富文本內容渲染**

```ejs
<!-- 自定義頁面標題 -->
<h1 class="text-3xl font-bold mb-6">
  <%= currentLanguage==='en' ? 'Frequently Asked Questions' : '常見問題' %>
</h1>

<!-- 自定義類別標籤 -->
<div class="border-b border-gray-200 mb-6">
  <div class="flex flex-wrap -mb-px" id="faq-tabs">
    <% categories.forEach(function(category, index) { %>
      <button type="button"
        class="category-tab mr-2 py-2 px-4 text-center border-b-2 <%= index === 0 ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' %>"
        data-category="<%= category.slug %>"
        onclick="switchCategory(this, '<%= category.slug %>')">
        <%= currentLanguage==='en' ? category.name_en : category.name_tw %>
      </button>
    <% }); %>
  </div>
</div>

<!-- 自定義問答列表 -->
<% categories.forEach(function(category, index) { %>
  <div id="<%= category.slug %>" class="category-content <%= index === 0 ? 'block' : 'hidden' %>">
    <% if (category.faqItems && category.faqItems.length > 0) { %>
      <div class="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <% category.faqItems.forEach(function(item, itemIndex) { %>
          <div class="border-b border-gray-200 <%= itemIndex === category.faqItems.length - 1 ? 'border-b-0' : '' %>">
            <!-- 問題標題 -->
            <button type="button"
              class="faq-question w-full flex justify-between items-center p-4 bg-white hover:bg-gray-50 focus:outline-none text-left"
              onclick="toggleAnswer(this)">
              <h3 class="text-lg font-medium text-gray-900">
                <%= currentLanguage==='en' ? item.title_en : item.title_tw %>
              </h3>
              <!-- 展開/收起箭頭 -->
              <svg class="faq-arrow w-5 h-5 text-gray-500 transform transition-transform duration-200"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <!-- 答案內容 -->
            <div class="faq-answer bg-gray-50 p-6 border-t border-gray-200 hidden">
              <div class="prose max-w-none">
                <div class="quill-content"
                  data-content="<%= encodeURIComponent(currentLanguage === 'en' ? item.content_en : item.content_tw) %>">
                </div>
              </div>
            </div>
          </div>
        <% }); %>
      </div>
    <% } else { %>
      <!-- 空狀態 -->
      <div class="bg-white shadow-md rounded-lg p-8 text-center text-gray-500">
        <%= currentLanguage==='en' ? 'No items found in this category.' : '此類別中沒有項目。' %>
      </div>
    <% } %>
  </div>
<% }); %>
```

### 自定義選項

1. **類別標籤**：
   - 修改標籤的外觀和佈局
   - 更改標籤的選中狀態樣式
   - 實現不同的標籤切換效果

2. **問答項目**：
   - 自定義問題和答案的樣式
   - 修改展開/收起的動畫效果
   - 更改箭頭圖標

3. **富文本渲染**：
   - 自定義富文本內容的樣式
   - 添加對不同內容格式的支援
   - 優化圖片和表格的顯示

4. **搜尋功能**：
   - 添加 FAQ 搜尋功能
   - 實現搜尋結果高亮
   - 添加相關問題推薦

5. **互動功能**：
   - 添加「這對我有幫助」按鈕
   - 實現問題評分系統
   - 添加「未找到答案？聯絡我們」功能

## 四、資料庫模型設計

### Contact 模型

```javascript
// prisma/schema.prisma
model ContactCategory {
  id         Int       @id @default(autoincrement())
  name_en    String
  name_tw    String
  isActive   Boolean   @default(true)
  order      Int       @default(0)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
  contacts   Contact[]
}

model Contact {
  id         Int       @id @default(autoincrement())
  name       String
  email      String
  company    String?
  phone      String?
  message    String
  status     String    @default("pending") // pending, processing, completed, spam
  ip         String?
  userAgent  String?
  categoryId Int?
  category   ContactCategory? @relation(fields: [categoryId], references: [id])
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
}
```

### Download 模型

```javascript
// prisma/schema.prisma
model DownloadCategory {
  id            Int        @id @default(autoincrement())
  name_en       String
  name_tw       String
  description_en String?
  description_tw String?
  isActive      Boolean    @default(true)
  order         Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?
  downloads     Download[]
}

model Download {
  id            Int       @id @default(autoincrement())
  title_en      String
  title_tw      String
  description_en String?
  description_tw String?
  keywords_en   String?
  keywords_tw   String?
  filePath      String
  originalName  String
  mimeType      String
  size          Int
  downloadCount Int       @default(0)
  isActive      Boolean   @default(true)
  categoryId    Int?
  category      DownloadCategory? @relation(fields: [categoryId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

### FAQ 模型

```javascript
// prisma/schema.prisma
model FaqCategory {
  id            Int       @id @default(autoincrement())
  name_en       String
  name_tw       String
  description_en String?
  description_tw String?
  slug          String    @unique
  isActive      Boolean   @default(true)
  order         Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  faqItems      FaqItem[]
}

model FaqItem {
  id            Int       @id @default(autoincrement())
  title_en      String
  title_tw      String
  content_en    String    @db.Text
  content_tw    String    @db.Text
  isActive      Boolean   @default(true)
  order         Int       @default(0)
  categoryId    Int
  category      FaqCategory @relation(fields: [categoryId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

## 五、最佳實踐

1. **多語言支援**：
   - 確保所有用戶界面文本都有多語言版本
   - 使用語言切換功能讓用戶可以切換語言
   - 保持翻譯的一致性和準確性

2. **響應式設計**：
   - 確保所有組件在不同設備上都能正常顯示
   - 使用 Tailwind 的響應式類別（如 `md:grid-cols-2`）
   - 測試在不同螢幕尺寸上的外觀

3. **無障礙性**：
   - 添加適當的 ARIA 屬性
   - 確保表單欄位有正確的標籤
   - 提供足夠的顏色對比度
   - 確保鍵盤導航可用

4. **性能優化**：
   - 最小化 JavaScript 代碼
   - 延遲加載非關鍵資源
   - 優化圖片和媒體文件
   - 使用適當的緩存策略

5. **用戶體驗**：
   - 提供清晰的錯誤訊息
   - 實現表單驗證以防止錯誤提交
   - 添加適當的加載狀態和反饋
   - 確保頁面導航直觀且一致 