# PDF 拆分工具專案稽核

- 稽核日期：2026-07-13
- 範圍：設定、架構、PDF/ZIP 處理、PWA、CI、測試、文件及產物
- 驗證：已執行 lint、40 個 Vitest 案例、正式 build、bundle budget、4 個 Chromium E2E 與 axe WCAG A/AA 自動檢查

## 1. 專案概覽

| 項目 | 內容 |
| --- | --- |
| 名稱 | `local-pdf-splitter` 0.1.0 |
| 技術 | React 19、TypeScript 7、Vite 8、PDF.js、pdf-lib、JSZip、Workbox |
| 套件管理 | npm 11.10.0；Node 25.8.2 |
| 開發 | `npm.cmd run dev` |
| 品質 | `npm.cmd run lint`、`npm.cmd run test`、`npm.cmd run build`、`npm.cmd run test:e2e` |
| 部署 | GitHub Actions 驗證後部署 GitHub Pages |

目前 `.git` 已重新初始化為 `main`，但尚未設定 remote 或建立初始 commit。

## 2. 專案結構

```text
pdf_splite/
├── .github/                 # 品質、Pages 與 Dependabot
├── e2e/                     # Playwright 主要流程與無障礙測試
├── scripts/                 # 300 行與 bundle 大小門檻
├── src/
│   ├── application/         # 工作區、命名與縮圖佇列 hooks
│   ├── components/          # 匯入、命名、頁池及分件 UI
│   ├── domain/              # 拆分規則、命名與工作量限制
│   ├── infrastructure/      # PDF/ZIP 服務、核心及 Worker client
│   ├── workers/             # PDF 拆分與 ZIP 壓縮 Worker
│   ├── styles/              # 分段樣式
│   ├── App.tsx
│   └── main.tsx
├── SECURITY.md
└── README.md
```

所有 `src` 原始碼均低於 300 行；目前較大的檔案是 `section-2.css` 278 行、`section-1.css` 248 行、`section-5.css` 247 行、`App.tsx` 232 行及 `use-pdf-workspace.ts` 216 行。

## 3. 產品功能盤點

- 單一或多份 PDF 匯入、來源頁數與來源色彩標示。
- 固定頁數拆分，以及拖曳建立、調整與刪除自訂分件。
- 延遲縮圖、最多同時兩個縮圖工作、Blob URL 清理及雙側虛擬滾動。
- 來源頁方向鍵導覽、分件內鍵盤排序、跨分件移動及 live region 公告。
- 穩定 PageRef 保存來源檔、來源頁碼、文件頁碼與旋轉角度。
- 命名積木、檔名清理、重複名稱穩定後綴。
- 單一 PDF 或 ZIP 下載；執行前阻擋空分件、越界與重複頁面。
- PWA 安裝、離線快取及提示式更新。
- 200 MB、2,000 頁硬上限；50 MB 或 500 頁工作量提示。

## 4. 架構與資料流

```text
main.tsx -> ErrorBoundary -> App -> usePdfWorkspace
                  ├── useThumbnailQueue -> PDF.js Worker
                  ├── PageRef registry + split-plan domain
                  ├── external export progress store
                  ├── split-plan domain
                  └── pdf-service
                      ├── pdf-output Worker -> pdf-lib
                      └── zip-output Worker -> JSZip
```

正式瀏覽器在 Worker 內拆分與壓縮；進度由獨立 external store 訂閱，避免高頻事件重繪整個工作區。PagePool 與 PartsBoard 只渲染可視範圍及 overscan。測試環境使用同一核心函式 fallback。PDF bytes、預覽代理與輸出只存在目前工作階段，沒有上傳 API 或持久化儲存。

## 5. 風險與缺口

### 架構與維護性

- `App.tsx` 與 `use-pdf-workspace.ts` 仍是跨功能協調中心；高頻進度已隔離，後續批次工作應再抽出 document 與 export controller。
- CSS 最大檔案已達 278 行，後續 UI 擴充應先依元件拆分。

### 安全與效能

- 已驗證副檔名/MIME、PDF 標頭、總大小及總頁數；加密 PDF 仍沒有密碼輸入流程。
- Worker 避免阻塞 UI，但瀏覽器仍會同時保留輸入、輸出與 ZIP，200 MB 上限仍需用低記憶體裝置實測。
- CSP 已限制 script、worker、connect、object 與 form 來源；GitHub repository 建立後仍應啟用 Private vulnerability reporting。

### PWA 與測試

- Chromium E2E 已覆蓋初始頁、匯入、命名、工作台、無效 PDF、ZIP 內容與離線重啟；Service Worker 更新提示仍未自動驗證。
- Firefox、WebKit、虛擬清單鍵盤焦點及大型 PDF 裝置矩陣仍待補。
- 自動 axe 檢查只能偵測部分無障礙問題，仍需人工鍵盤與螢幕閱讀器測試。

## 6. 優化路線圖

### 立即

1. 設定 Git remote、建立初始 commit，啟用 GitHub Pages 與 Private vulnerability reporting。
2. 決定 MIT、Apache-2.0 或專有授權並新增 `LICENSE`。
3. 使用真實、無敏感資料的 50／200／500 頁 PDF 記錄桌機與行動裝置效能。

### 中期

1. 增加 ZIP 下載內容、離線重啟、Service Worker 更新與錯誤 PDF E2E。
2. 將 Playwright 擴充至 Firefox，並在 macOS runner 驗證 WebKit。
3. 以 500／1,000／2,000 頁 fixture 量測虛擬清單 DOM 數、FPS 與記憶體峰值。

### 長期

1. 量測記憶體峰值後，評估分批輸出或更低複製成本的 archive 實作。
2. 若加密 PDF 需求成立，再設計密碼輸入與敏感資訊生命週期。

## 7. 下一輪 Codex 任務

### 任務 1：完成 repository 發布設定

- 目標：讓 CI 與 GitHub Pages 真正執行。
- 範圍：remote、初始 commit、Pages、Private vulnerability reporting。
- 驗收：PR quality 與 Pages workflow 均成功。
- 驗證：`git status && git remote -v`

### 任務 2：加入真實大型 PDF 效能矩陣

- 目標：取得 50／200／500 頁的時間與記憶體基線。
- 範圍：無敏感資料 fixture 與文件，不調整產品上限。
- 驗收：記錄匯入、首張縮圖、拆分及 ZIP 指標。
- 驗證：`npm.cmd run test`

### 任務 3：完成 Service Worker 更新 E2E

- 目標：驗證新版 Service Worker 安裝與提示式更新。
- 範圍：Playwright Chromium 測試。
- 驗收：偵測新版、接受更新、重新載入與工作階段警告均有斷言。
- 驗證：`npm.cmd run test:e2e`

### 任務 4：強化鍵盤重排公告

- 目標：移動後保留焦點並讓螢幕閱讀器朗讀結果。
- 範圍：現有鍵盤移動按鈕、焦點管理與 `aria-live` 訊息。
- 驗收：命名積木與頁面移動後焦點不丟失，且結果會被朗讀。
- 驗證：`npm.cmd run lint && npm.cmd run test:e2e`

### 任務 5：擴充跨瀏覽器驗證

- 目標：降低 Firefox 與 Safari 相容性風險。
- 範圍：Playwright Firefox/WebKit 專案與 CI matrix。
- 驗收：主要匯入與拆分流程在三個引擎通過。
- 驗證：`npx.cmd playwright test --project=firefox --project=webkit`
