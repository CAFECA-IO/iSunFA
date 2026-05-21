# 🚀 iSunFA Worker 踩雷實錄 (Troubleshooting Log)

> **Date**: May 2026
> **Scope**: `src/services/*.service.ts`
> **Info**: (20260521 - Julian)

這份文件詳細記錄了我們在擴展 `iSunFA Worker` (多開並發處理) 時遭遇的效能瓶頸與異常狀況。
⚠️注意：本文件非真正的優化建議，開發方向也與 iSunFA 的核心不同，僅供紀錄，請勿直接套用。

---

> Info: (20260521 - Luphia) 文件內分析的根本原因基本上都是錯的，真實原因在於同一份檔案被多的線程同時存取造成的異常，有時讀到不完整的檔案，有時是檔案被清空，作為經典案例供大家參考 —— AI 會一本正經瞎掰理由再根據錯誤的論述亂改程式碼，千萬不要完全相信 AI

## 💣 踩雷一：Worker 解析進度卡死不前 (The Silent Hang)

> [!WARNING]
> **症狀：** Worker 執行到 `[MissionExecutor] -> Running sub-task [JOURNAL]` 時，會突然徹底失去反應，終端機沒有噴錯，但進度條好幾分鐘都不動。

* **根本原因 (Root Cause)：** 
  Gemini API 在處理含有大量影像的複雜 Prompt 時，如果剛好遇到網路波動或 API 伺服器滿載，請求會無限期掛起 (Hang)。而原本的底層呼叫 `model.generateContent` 時**沒有設定明確的 Timeout 機制**，導致 Node.js 的 Thread 被永久鎖死在等待回傳的狀態。

* **修正方案：**
  * **修改檔案：** `src/services/chat.service.ts`
  * **修改原因：** 為底層 API 呼叫加上 `Promise.race` 封裝，給予明確的 Timeout，確保執行緒能正常拋錯並觸發退避機制，不會永遠卡死。
  * **修改細節：**
    1. 在檔案最上方加入工具函式：
       ```typescript
       const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
         return Promise.race([
           promise,
           new Promise<T>((_, reject) =>
             setTimeout(() => reject(new Error(`AI Request timed out after ${ms}ms`)), ms)
           ),
         ]);
       };
       ```
    2. 將 `generateRawWithImages` 等發送請求的地方包裝起來：
       ```typescript
       // 原本: const result = await model.generateContent(parts);
       const result = await withTimeout(model.generateContent(parts), 120000); // 120秒保護
       ```

---

## 💣 踩雷二：開越多台越慢的「塞車慘案」(Rate Limit & Backoff)

> [!CAUTION]
> **症狀：** 使用者為了加速開了 7 台 Worker 同時跑，結果不僅沒變快，反而頻繁出現 `JSON Parsing Failed` 與 `AI 暫時無法解析` 的錯誤，速度比只開 1 台還慢。

* **根本原因 (Root Cause)：** 
  `.env` 中只配置了一把**免費版的 Gemini API Key**。免費版的硬性限制為 **15 RPM**。當 7 台 Worker 瞬間發送請求，會觸發 429 Too Many Requests。Google SDK 內建的「指數退避 (Exponential Backoff)」機制會導致所有 Worker 被強制罰站，造成惡性循環。

* **修正方案：**
  * **修改檔案：** `src/services/chat.service.ts`
  * **修改原因：** 實作「多 API Key 輪詢 (Load Balancing)」機制。讓系統支援讀取 `GEMINI_API_KEYS` 陣列，隨機分散請求，繞過單把 Key 的物理速限。
  * **修改細節：**
    1. 修改 `ChatService` 的變數與建構子，支援多把 Key（使用 `,` 分隔）：
       ```typescript
       private genAIs: GoogleGenerativeAI[] = [];
       constructor(apiKeyOrKeys: string) {
         const keys = process.env.GEMINI_API_KEYS
           ? process.env.GEMINI_API_KEYS.split(",")
           : apiKeyOrKeys.split(",");
         this.genAIs = keys.map((key) => new GoogleGenerativeAI(key.trim()));
       }
       ```
    2. 新增一個 `getGenAI()` 隨機抽換機制：
       ```typescript
       private getGenAI(): GoogleGenerativeAI {
         const randomIndex = Math.floor(Math.random() * this.genAIs.length);
         return this.genAIs[randomIndex];
       }
       ```
    3. 發送請求前皆呼叫 `const model = this.getGenAI().getGenerativeModel(...)`。

---

## 💣 踩雷三：做白工！解完的任務不寫入資料庫 (Missing Order Bug)

> [!IMPORTANT]
> **症狀：** 終端機洗版 `Task ID xxx has no Order in database yet`，且 UI 上的「Pending Journals」數量永遠不減少。

* **根本原因 (Root Cause)：** 
  任務被 AI 解析完成後，會由 `IssueRecorder` 負責同步回資料庫。但舊版程式碼有嚴格檢查：如果找不到該任務對應的 `Order` 紀錄，就會直接 `continue` 跳過。這導致沒掛 Order 的歷史任務或測試任務，永遠無法更新會計憑證狀態，也永遠不會寫入 `recorded.flag`，讓 Worker 陷入無限輪迴掃描。

* **修正方案：**
  * **修改檔案：** `src/services/issue.recorder.service.ts`
  * **修改原因：** 解除對 `Order` 的強依賴。就算找不到 Order，也必須將 `dbSyncPayload` 同步到 Journal / Voucher 等資料表，並留下標記。
  * **修改細節：**
    1. 將找不到 Order 時的 `continue` 拿掉：
       ```typescript
       // 原本：
       // if (!order) { console.warn(...); continue; }
       
       // 改為：
       if (!order) {
         console.warn(`Proceeding with DB sync without Order...`);
       }
       ```
    2. 將後續針對 `order` 屬性的讀寫 (如 `order.tokens` 計算與 `orderRepo.update`) 嚴格使用 `if (order) { ... }` 區塊包裝，避免 TypeScript 報錯 (`Object is possibly 'null'`)。

---

## 💣 踩雷四：多台 Worker 搶同一塊肉的「無限空轉」(Busy Loop)

> [!WARNING]
> **症狀：** 多台 Worker 同時啟動時會導致 CPU 飆高至 100%，瘋狂吃效能卻沒有真正在處理任務。

* **根本原因 (Root Cause)：** 
  1. **固定排序掃描：** 所有 Worker 預設使用字母順序掃描 `missions` 資料夾，保證多台 Worker 永遠會同時選中「同一個」目標。
  2. **錯誤的上鎖位置：** 建立 `executing.lock` 原子鎖的邏輯被寫在尋找任務的 `for` 迴圈**之外**。當 4 台 Worker 同時鎖定任務 A，失敗的 3 台會直接 `return` 結束這回合。在下一次循環中，這 3 台又會掃描到同一個任務 A，再次搶鎖失敗、再次 `return`。每秒發生數萬次，形成災難性的無限空轉 (Busy Spin)。

* **修正方案：**
  * **修改檔案：** `src/services/mission.executor.service.ts`
  * **修改原因：** 確保 Worker 在搶鎖失敗時，能「立刻」繼續尋找下一個未鎖定的任務，而不是放棄並重啟整個流程。
  * **修改細節：**
    1. **陣列隨機洗牌：** 讀取資料夾後打亂順序。
       ```typescript
       const folders = await fs.readdir(missionDirPath, { withFileTypes: true });
       folders.sort(() => Math.random() - 0.5); // 加入此行隨機化
       ```
    2. **迴圈內上鎖：** 將建立 `executing.lock` 的邏輯移入 `for` 迴圈內。
       ```typescript
       for (const folder of folders) {
         // ...
         try {
           await fs.writeFile(path.join(taskDir, "executing.lock"), Date.now().toString(), { flag: "wx" });
           targetFolderInfo = { name: folder.name, useJsonPlan };
           break; // 成功上鎖才跳出迴圈
         } catch {
           // 搶鎖失敗，別人正在執行
           continue; // 直接嘗試下一個任務！
         }
       }
       ```
    3. **忽略暫存資料夾 (Git Ignore)：** 因為多開 Worker 會需要指定不同的環境變數 (例如 `MISSION_DIR=missions_4`)，這會在本地端產生大量如 `missions_2`, `missions_3` 等動態生成的資料夾。請務必在 `.gitignore` 加上以下設定，避免 Git 追蹤到這些龐大的暫存執行檔：
       ```gitignore
       /issues*
       /missions*
       ```

---

## 💡 加碼建議：緊急中斷龐大卡關任務 (Database Bypass)

> [!TIP]
> **情境：** 如果未來又遇到某一間公司憑證量極大，嚴重卡住後方其他公司的進度，想直接跳過它。

* **修正方案：** 
  遇到這種需緊急清創的情況，不要只刪除實體檔案。建議撰寫一支專用腳本 (例如 `scripts/skip-company.ts`) 雙管齊下：
  1. 使用 Prisma 將該 `accountBookId` 旗下狀態為 `PENDING` 或 `PROCESSING` 的 Journal / Voucher 狀態統一強改為 `AIAnalysisStatus.FAILED`。
  2. 掃描 `missions` 與 `issues` 資料夾，讀取 `mission.json` 比對該公司 ID，直接刪除整包任務資料夾。
  這樣便能瞬間清空佇列，且 UI 也會同步顯示失敗，不會產生懸掛狀態。
