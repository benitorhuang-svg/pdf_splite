# PDF 拆分工具：DDD 規劃與 MVP 實作

## 目標

建立一個隱私優先、可在本機處理檔案的 PDF 拆分工具。使用者能匯入單一 PDF、設定拆分規則、預覽輸出結果，並下載單一 PDF 或 ZIP 壓縮檔。

第一階段採用模組化單體（Modular Monolith），透過 DDD 劃分領域邊界，不在 MVP 階段拆成微服務。

## 使用者故事

身為需要整理 PDF 的使用者，我希望能：

- 拖放或選擇一份 PDF。
- 在處理前確認檔名、大小、總頁數及加密狀態。
- 依固定頁數拆分文件，或用拖曳建立自訂頁碼範圍；固定頁數設為 1 時逐頁拆分。
- 在執行前預覽每個輸出檔案包含哪些頁面。
- 自訂輸出檔名規則。
- 下載個別結果或將全部結果打包成 ZIP。
- 在不將文件上傳到伺服器的情況下完成處理。

## MVP 範圍

### 1. PDF 匯入

- 支援點擊選檔與拖放匯入。
- 僅接受 PDF。
- 顯示：
  - 原始檔名
  - 檔案大小
  - 總頁數
  - 是否加密
- 偵測空白、損毀、不支援或無法讀取的 PDF。
- MVP 僅處理單一來源文件。

### 2. 頁面預覽

- 顯示頁面縮圖與頁碼。
- 支援縮圖載入中、失敗及重新載入狀態。
- 大型文件採漸進式或延遲載入，避免一次渲染所有縮圖。

### 3. 拆分方式

- 每固定頁數一個檔案，例如每 5 頁一份。
- 設定每份 1 頁時，每頁輸出一個檔案。
- 頁碼範圍以拖曳分組，不提供文字範圍輸入。

### 4. 拆分結果預覽

- 執行前列出預計產生的分件。
- 每個分件顯示輸出檔名及包含頁面。
- 規則改變時同步更新預覽。
- 可將分件內頁面拖回來源頁區，以移出目前分件。
- 無效規則不得進入處理階段。

### 5. 輸出與下載

- 支援自訂命名範本。
- 支援的命名變數：
  - `{originalName}`
  - `{partNumber}`
  - `{startPage}`
  - `{endPage}`
  - `{date}`
- 可下載單一輸出 PDF。
- 可將全部輸出檔案打包成 ZIP 下載。
- 檔名衝突時必須產生唯一名稱。

### 6. 工作狀態

- 顯示驗證、處理及打包進度。
- 支援取消尚未完成的工作。
- 顯示可理解且可操作的錯誤訊息。
- 支援清除目前文件及釋放相關資源。

## 領域設計

### 限界上下文：文件匯入（Document Import）

負責接收、解析及驗證來源文件。

主要模型：

- `SourceDocument`
- `DocumentId`
- `FileName`
- `DocumentMetadata`
- `PageCount`
- `ImportPolicy`

領域規則：

- 來源必須是可讀取的 PDF。
- 文件至少包含一頁。
- 損毀文件不得進入拆分流程。
- 加密文件在未解鎖前不得建立拆分計畫。
- 文件大小不得超過系統設定的限制。

### 限界上下文：拆分規劃（Split Planning）

核心領域，負責表達並驗證文件如何被拆分。

主要模型：

- `SplitPlan`（聚合根）
- `SplitRule`
- `PageRange`
- `PageSelection`
- `OutputPart`

規則類型：

- `FixedPageCount`
- `PageRanges`

領域規則：

- 頁碼從 1 開始。
- 頁碼不得超出文件總頁數。
- 範圍起始頁不得大於結束頁。
- 每個輸出分件至少包含一頁。
- MVP 不允許重複選取同一頁。
- 不得產生空白分件。
- 拆分計畫必須通過驗證才能執行。

### 限界上下文：PDF 處理（PDF Processing）

負責按照已驗證的拆分計畫讀取、擷取及寫入 PDF；不負責決定拆分業務規則。

主要介面：

- `PdfReader`
- `PdfProcessor`
- `PageExtractor`
- `PdfWriter`
- `ProcessingProgress`

PDF 函式庫必須封裝在基礎設施層，領域層不得直接依賴特定套件。

### 限界上下文：輸出管理（Output Management）

負責輸出檔名、下載檔案與 ZIP 打包。

主要模型：

- `OutputPackage`
- `OutputFile`
- `NamingTemplate`
- `ExportOptions`

### 限界上下文：工作階段（Job Session）

負責一次拆分工作的生命週期。

主要模型：

- `SplitJob`（聚合根）
- `JobStatus`
- `ProcessingError`
- `JobProgress`

狀態流程：

```text
Draft -> Validated -> Processing -> Completed
                    |            -> Failed
                    -> Cancelled
```

不變條件：

- 沒有來源文件不得建立拆分工作。
- 未通過驗證不得開始處理。
- 處理中的工作不得修改拆分規則。
- 完成的工作至少包含一個輸出檔案。
- 失敗的工作必須保留失敗原因。

## 應用層 Use Cases

- `ImportPdf`
- `CreateSplitPlan`
- `UpdateSplitRule`
- `PreviewSplitResult`
- `ExecuteSplitJob`
- `CancelSplitJob`
- `DownloadOutputFile`
- `DownloadOutputPackage`
- `ClearWorkspace`

主要流程：

```text
匯入 PDF
-> 解析與驗證文件
-> 選擇拆分方式
-> 驗證拆分規則
-> 預覽輸出分件
-> 執行拆分
-> 下載單一 PDF 或 ZIP
```

## 驗收條件

### PDF 匯入

- [ ] Given 使用者選擇有效 PDF，When 匯入完成，Then 顯示檔名、大小及正確總頁數。
- [ ] Given 使用者選擇非 PDF，When 嘗試匯入，Then 拒絕檔案並顯示原因。
- [ ] Given PDF 已損毀或無法解析，When 嘗試匯入，Then 不建立拆分工作並顯示錯誤。
- [ ] Given PDF 已加密，When 尚未提供正確密碼，Then 不允許建立拆分計畫。

### 拆分規則

- [ ] Given 10 頁 PDF，When 設定每份 1 頁，Then 預覽顯示 10 個分件。
- [ ] Given 12 頁 PDF，When 設定每 5 頁拆分，Then 預覽顯示頁面 `1-5`、`6-10`、`11-12` 三個分件。
- [ ] Given 使用者切換頁碼範圍，When 拖曳頁面到不同分件，Then 預覽依拖曳結果更新。
- [ ] Given 頁碼為 `0`、負數或超過總頁數，When 驗證規則，Then 顯示錯誤並停用執行按鈕。
- [ ] Given 重疊範圍，When 驗證規則，Then 顯示重複頁面錯誤。
- [ ] Given 空白規則，When 嘗試執行，Then 不開始處理。

### 處理與輸出

- [ ] Given 有效拆分計畫，When 執行完成，Then 每個輸出 PDF 的頁數及順序符合預覽。
- [ ] Given 自訂命名範本，When 產生輸出，Then 正確替換所有命名變數。
- [ ] Given 輸出名稱重複，When 產生檔案，Then 自動建立唯一且合法的檔名。
- [ ] Given 多個輸出檔案，When 選擇下載全部，Then ZIP 包含所有預覽中的 PDF。
- [ ] Given 工作正在處理，When 使用者取消，Then 停止後續處理並顯示取消狀態。
- [ ] Given 使用者清除工作區，When 清除完成，Then 文件、縮圖、輸出 Blob 及記憶體引用均被釋放。

### 隱私與安全

- [ ] PDF 內容不得因拆分功能上傳到遠端伺服器。
- [ ] PDF 內嵌 JavaScript 不得被執行。
- [ ] 錯誤紀錄不得包含文件內容或密碼。

## 非功能需求

- 優先支援最新版 Chrome、Edge、Firefox 與 Safari。
- 大型 PDF 處理時，使用者介面不得長時間無回應。
- 耗時處理應移至 Web Worker 或等效背景執行環境。
- 完成、取消或清除工作後，必須釋放 Blob URL、ArrayBuffer 與縮圖資源。
- 鍵盤使用者能完成匯入、規則設定、執行及下載。
- 狀態及錯誤訊息應提供螢幕閱讀器可辨識的語意。
- 核心領域邏輯需能在不啟動 UI、不載入真實 PDF 函式庫的情況下單元測試。

## 測試需求

- 單元測試：
  - 拆分規則驗證
  - 固定頁數分組
  - 輸出命名規則
  - `SplitJob` 狀態轉換
- 整合測試：
  - PDF 讀取、頁面擷取與寫入
  - ZIP 打包
  - 取消與資源釋放
- 端對端測試：
  - 匯入 -> 設定規則 -> 預覽 -> 拆分 -> 下載
  - 非法檔案與無效頁碼處理
- 測試夾具至少包含：
  - 單頁 PDF
  - 多頁 PDF
  - 加密 PDF
  - 損毀 PDF
  - 大型 PDF

## 不在 MVP 範圍

- 多份 PDF 批次處理
- 拖曳重新排序頁面
- 頁面旋轉或刪除
- PDF 合併
- 依書籤、文字、空白頁、條碼或 QR Code 拆分
- OCR 與文件內容分類
- 雲端儲存、帳號與跨裝置同步
- 團隊規則共享

## 後續里程碑

### Phase 2

- 批次處理多份 PDF。
- 拖曳排序、旋轉與刪除頁面。
- 儲存常用拆分規則。
- 最近處理紀錄。
- PWA 與完整離線支援。

### Phase 3

- 依書籤或章節拆分。
- 偵測空白頁作為分隔點。
- 依關鍵字、條碼或 QR Code 拆分。
- OCR 與內容分類。
- 輸出 PDF 加密。

## Definition of Done

- [ ] 所有 MVP 驗收條件通過。
- [ ] 核心領域模型不依賴 UI 或特定 PDF 函式庫。
- [ ] 單元、整合及主要端對端測試通過。
- [ ] 支援的瀏覽器完成基本煙霧測試。
- [ ] 無 PDF 內容上傳至遠端服務。
- [ ] 完成大型檔案的效能及記憶體測試。
- [ ] 錯誤、取消及清除流程均可正確釋放資源。
- [ ] README 包含啟動方式、架構說明與隱私聲明。
