# 家醫智問 FamilyCare Assist V1

可部署到 GitHub Pages 的家庭醫學科智慧問診輔助前端。醫師貼上自己的 System Prompt 與 Gemini API Key，完成金鑰驗證與模型選擇後，才能進入 ChatBOT 問診介面。

## V1 已完成

- 設定閘門：風險同意、System Prompt、API Key 驗證、模型選擇缺一不可。
- System Prompt 編輯器：名稱、字數、Token 估算、SHA-256 短指紋、TXT／MD 匯入、組合提示詞預覽。
- 三層提示詞：平台安全前言＋醫師自訂提示詞＋平台技術約束。
- Gemini API Key：密碼欄位、顯示／隱藏、驗證、末四碼、驗證時間、清除與鎖定。
- Models API：動態取得支援 `generateContent` 的模型，不把模型名稱寫死。
- Gemini `generateContent`：帶入 System Instruction 與目前工作階段對話。
- 401／403、429、5xx、Safety Block、空回覆與網路錯誤處理。
- API Key 預設只存在 JavaScript 記憶體；可選擇僅在目前分頁的 `sessionStorage` 暫存。
- 正體中文、簡體中文、英文、泰語、印尼語、越南語。
- 手機、平板、Notebook、PC 響應式介面。
- 瀏覽器支援時提供語音轉錄；轉錄後不會自動送出。
- SOAP 範例案例庫與自訂 JSON 匯入。
- Content Security Policy、無第三方執行程式、使用者與模型文字一律以 `textContent` 顯示。
- GitHub Pages 自動部署工作流程。

## 重要安全限制

這是 **GitHub Pages／瀏覽器端 BYOK** 版本。雖然 API Key 不會寫入 Repository，但只要金鑰存在瀏覽器，就可能被瀏覽器擴充功能、開發者工具、XSS 或共用裝置取得。

- 不要把 API Key 寫入任何專案檔案或 Git Commit。
- 優先使用 Google AI Studio 新建立、僅限 Gemini API 的金鑰。
- 設定用量與費用警示，懷疑外洩時立即撤銷金鑰。
- 未完成醫療機構的隱私、資安與法遵審查前，不要輸入可識別的真實病患資料。
- Google 的 Gemini API 條款明確提醒，不得向 Unpaid Services 提交敏感、機密或個人資訊。
- 所有輸出都必須由合格醫事人員覆核。

真正用於多人、真實病歷或正式醫療流程時，應改成：

```text
Browser → 自有後端／Cloud Run／Worker → Gemini API
```

由後端保存金鑰、驗證使用者、執行 DLP、權限與稽核。

## 本機啟動

不可直接雙擊 `index.html`，因為瀏覽器通常會阻擋 `file://` 載入 JSON 語系及案例檔。

### Windows

雙擊：

```text
start-server.bat
```

或執行：

```powershell
.\start-server.ps1
```

開啟：

```text
http://localhost:8080
```

## 第一次測試

1. 開啟網站。
2. 閱讀並勾選 BYOK 風險聲明。
3. 將 `data/prompts/family-medicine-example.md` 貼入或匯入提示詞編輯器。
4. 貼上自己的 Gemini API Key。
5. 按「驗證 API Key」。
6. 從動態清單選擇模型。
7. 按「進入問診」。
8. 輸入虛構或去識別化主訴測試。

## 部署到 GitHub Pages

### 方法一：內建 GitHub Actions

專案已包含：

```text
.github/workflows/pages.yml
```

操作：

1. 建立 GitHub Repository。
2. 將解壓後的全部內容放在 Repository 根目錄。
3. 推送到 `main` Branch。
4. 到 `Settings → Pages`。
5. 在 `Build and deployment → Source` 選擇 `GitHub Actions`。
6. 開啟 Actions，確認 `Deploy FamilyCare Assist to GitHub Pages` 成功。

### 方法二：由 Branch 發布

1. 到 `Settings → Pages`。
2. Source 選擇 `Deploy from a branch`。
3. 選擇 `main` 與 `/ (root)`。

專案使用相對路徑，可部署在：

```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

## API 實作

### 驗證金鑰與取得模型

```http
GET https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000
x-goog-api-key: USER_API_KEY
```

### 對話

```http
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
Content-Type: application/json
x-goog-api-key: USER_API_KEY
```

System Instruction 每次都由以下三層組合：

```text
平台不可變更安全前言
＋
醫師自訂 System Prompt
＋
平台技術與輸出約束
```

## API Key 保存

預設：

- 只放在 JavaScript 記憶體。
- 重新整理或關閉分頁後清除。

勾選「只在目前分頁期間記住」：

- 存放於 `sessionStorage`。
- 關閉分頁後通常失效。
- 不會寫入 `localStorage`、Cookie、URL 或 Repository。

按下「鎖定」會立即清除目前分頁內的 API Key。

## 專案結構

```text
familycare-assist-v1/
├─ index.html
├─ 404.html
├─ .nojekyll
├─ .github/workflows/pages.yml
├─ README.md
├─ SPECIFICATION.md
├─ assets/
├─ styles/
│  └─ setup-gate.css
├─ scripts/
│  ├─ setup-gate.js
│  ├─ prompt-manager.js
│  ├─ credential-vault.js
│  ├─ gemini-model-service.js
│  ├─ request-builder.js
│  ├─ security-policy.js
│  └─ api-client.js
├─ locales/
├─ data/examples/
└─ data/prompts/
```

## System Prompt 更新規則

對話開始後回到設定頁修改提示詞，再次進入問診時會建立新的工作階段，不會將舊病患對話與新提示詞混用。

## 官方參考

- Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key
- Gemini Models API: https://ai.google.dev/api/models
- Generate Content API: https://ai.google.dev/api/generate-content
- GitHub Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 免責聲明

本專案是醫療問診與文件整理輔助介面，不是醫療器材，不提供獨立診斷、處方或緊急醫療判斷。
