# PDF 拆分工具專案稽核

- 稽核日期：2026-07-18
- 稽核範圍：PDF/ZIP 處理、PWA、GitHub Pages 部署、效能、記憶體與測試
- 稽核方式：靜態檢查原始碼與設定，並執行 lint、unit test、build、bundle budget、Chromium／Firefox／WebKit E2E

## 1. 專案基本資訊

| 項目 | 現況 |
| --- | --- |
| 名稱 | `local-pdf-splitter` 0.1.0 |
| 技術棧 | React 19、TypeScript 7、Vite 8、PDF.js、pdf-lib、JSZip、Workbox |
| 套件管理 | npm 11.10.0；Node.js 25.8.2（`.nvmrc`） |
| 品質檢查 | `npm.cmd run lint`、`npm.cmd run test` |
| 建置 | `npm.cmd run build`；包含 TypeScript、Vite 與 bundle 預算檢查 |
| 瀏覽器驗證 | `npm.cmd run test:e2e`；Chromium、Firefox、WebKit |
| 部署 | GitHub Actions 建置標準 `dist/` 後部署 GitHub Pages |

## 2. 專案結構

```text
pdf_splite/
├── .github/workflows/       # PR 品質檢查與 GitHub Pages 部署
├── e2e/                     # Playwright 流程與 axe 無障礙測試
├── public/                  # PWA 圖示與 favicon
├── scripts/                 # 原始碼行數與 bundle 大小門檻
├── src/
│   ├── domain/              # 拆分規則、PageRef、限制與驗證
│   ├── application/         # 工作區狀態、縮圖佇列、命名與進度
│   ├── components/          # 匯入、預覽、分件、拖曳與命名 UI
│   ├── infrastructure/      # PDF.js、pdf-lib、JSZip 與 Worker client/core
│   ├── workers/             # PDF 合併、產出與 ZIP 壓縮 Worker
│   └── styles/              # 分段 CSS
├── vite.config.ts           # Vite、PWA 與 GitHub Pages build 設定
├── README.md                # 功能、操作、部署與限制
└── SECURITY.md              # 信任邊界與安全回報政策
```

目前 `src` 下受規範的原始檔均未超過 300 行；lint 的行數檢查涵蓋 68 個來源檔案。

## 3. 架構與資料流

```text
File input
  -> PDF.js 解析與縮圖
  -> PageRef / split-plan 建立分件
  -> pdf-merge Worker 合併多份 PDF並檢查累計頁數
  -> pdf-output Worker 產生 PDF
  -> zip-output Worker 打包 ZIP
  -> 瀏覽器下載
```

來源 PDF、合併文件、縮圖代理、輸出 PDF 與 ZIP bytes 都只存在目前瀏覽器工作階段記憶體中；沒有文件上傳 API、帳號、資料庫或伺服器端 PDF 工作佇列。

PDF 合併、PDF 輸出與 ZIP 壓縮在支援 Worker 的瀏覽器中執行背景處理；測試環境或不支援 Worker 時，使用相同核心函式的 dynamic import fallback。多檔合併會在複製頁面前檢查累計 2,000 頁上限，並支援匯入競態取消。

## 4. GitHub Pages 與 PWA

GitHub Pages 是唯一正式發布路徑。Vite 使用相對 `base`，GitHub Actions 將標準 `dist/` 發布至 `https://<user>.github.io/<repo>/` 子路徑；專案不再包含 Cloudflare/Sites plugin、server Worker 或其他託管平台輸出。

Workbox 預快取主要 JavaScript、CSS、圖片與 PDF.js `.mjs` worker，因此 Chromium E2E 會驗證安裝後離線匯入 PDF。Service Worker 使用提示式更新，更新頁面會清除尚未下載的工作階段資料。

## 5. 已完成的優化

1. 多檔 PDF 合併移入 Worker，並在合併期間檢查累計頁數與取消狀態。
2. PDF 輸出改為逐頁檢查取消；單一分件下載只產生指定分件。
3. ZIP Worker 直接回傳 Blob，ZIP 成功下載後釋放暫存輸出 bytes。
4. 縮圖依裝置像素比產生，並以 160 張上限與 Blob URL 回收控制記憶體。
5. Bundle 檢查保留單檔門檻，並新增 4,500 KiB 總產物門檻；目前建置約 3.36 MB。
6. E2E 擴充至 Chromium、Firefox、WebKit，加入多檔合併、指定分件、離線匯入與 WCAG 檢查。

## 6. 目前風險與邊界

- 大型 PDF 仍可能受裝置記憶體限制；瀏覽器需要同時保留來源、合併、輸出與縮圖資料。
- 加密 PDF 尚未提供密碼輸入流程；若加入，密碼生命週期與錯誤訊息需獨立設計。
- 實際 iOS Safari、Android Chrome 與低記憶體裝置仍需發布前手動煙霧測試。
- 真實 50 MB、200 MB、500 頁、2,000 頁及多檔文件的時間／峰值記憶體仍應持續量測。

## 7. 發布門檻

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

本次已驗證：lint 通過、14 個 Vitest 檔案／43 個案例通過、build 與 bundle budget 通過。完整 E2E 需要已安裝 Playwright Chromium、Firefox、WebKit 的環境。

## 8. 後續量測工作

- 建立無敏感資料的大檔案效能矩陣，記錄匯入、首張縮圖、拆分、ZIP 與記憶體峰值。
- 加入旋轉頁、字型、透明度、表單與密碼 PDF 的相容性 fixture。
- 發布前在實際行動裝置與低記憶體環境完成手動煙霧測試。
