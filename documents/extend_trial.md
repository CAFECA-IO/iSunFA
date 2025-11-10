## 自動延長試用期腳本 (Daily Trial Extension Script)

### 1\. 目的

此腳本 (Script)
的目的是取代原有的 API
端點，改用一個更穩定、可排程的伺服器端腳本來執行批次任務。

此腳本會每日自動執行，檢查系統中的所有 `Team`
，並為符合特定條件的團隊自動建立或延長一個月的 `TRIAL` 試用期。

### 2\. 核心邏輯

此腳本會執行以下操作：

1.  腳本被 `npm` 或 `cron` 觸發。
2.  腳本會查詢資料庫中**所有**的 `Team`
    ，並同時取得他們**最新的一筆** `TeamSubscription`
    紀錄。
3.  它會遍歷每一個 `Team` 並檢查是否**符合**以下任一條件：
      * 該 `Team`
        **沒有**任何 `TeamSubscription` 紀錄。
      * 該 `Team`
        最新的 `TeamSubscription` 紀錄中，`planType`
        是 `BEGINNER`。
      * 該 `Team`
        最新的 `TeamSubscription` 紀錄中，`planType`
        是 `null` 或 `undefined`。
4.  **如果符合條件**：
      * 腳本會為該 `Team`
        建立一筆**新的** `TeamSubscription` 紀錄。
      * 新紀錄的 `planType` 將設為 `TRIAL`。
      * `startDate` 設為當下時間。
      * `expiredDate` 設為**一個月後**的時間。
      * 此操作會被詳細記錄到日誌檔中。
5.  **如果不符合條件** (例如 `Team`
    已有 `PROFESSIONAL` 或 `TRIAL`
    方案)：
      * 腳本會跳過該 `Team`
        ，並記錄一筆 `SKIP`
        日誌。

### 3\. 相關檔案

  * `scripts/extend_daily_trials.ts`:
    包含上述所有核心業務邏輯的 TypeScript
    腳本。它使用 `console.log` 和 `console.error`
    將日誌輸出到 `stdout` 和 `stderr`。
  * `shell/manage_trial_job.sh`:
    用於在伺服器上（Mac 或
    Ubuntu）「開啟」（新增 cronjob）或「關閉」（移除
    cronjob）此每日排程的 Shell
    管理腳本。
  * `package.json`: 包含一個 `npm` 指令
    (`script:extend_trials`)
    ，用於在開發環境中手動執行此腳本。

-----

### 4\. 如何使用

#### A. 在開發環境中（手動執行與除錯）

如果想在本地機器上立即執行一次腳本以進行測試或除錯：

1.  開啟終端機。

2.  執行以下 `npm` 指令：

    ```bash
    npm run script:extend_trials
    ```

3.  所有日誌（`INFO` 和 `ERROR`）將會**直接輸出到終端機**上。

      * **注意：**
        此命令*不會*將日誌寫入到
        `private/logs`
        目錄，因為日誌導向是由 `shell` 腳本管理的。

#### B. 在生產環境中（設定每日排程）

以下步驟用於在生產環境伺服器（Mac 或 Ubuntu）上設定每日自動排程。

**1. 賦予執行權限 (僅需執行一次)**

在伺服器上，首先給予 `.sh` 腳本執行的權限：

```bash
chmod +x shell/manage_trial_job.sh
```

**2. 啟動每日排程**

執行以下命令來啟動排程：

```bash
bash shell/manage_trial_job.sh start
```

此命令會自動完成以下所有操作：

  * **自動偵測路徑**：腳本會自動抓取專案的絕對路徑，無需手動設定。
  * **建立日誌目錄**：自動建立 `private/logs`
    目錄（如果它不存在）。
  * **加入排程**：將此腳本加入您伺服器的 `crontab`
    中，預設排定在每日凌晨 3:00 執行。
  * **立即執行**：在 `crontab`
    設定完成後，腳本會**立即在背景執行一次**，方便馬上確認日誌。

**3. 停止每日排程**

如果未來需要停止這個每日排程，只需執行：

```bash
bash shell/manage_trial_job.sh stop
```

此命令會自動從 `crontab` 中尋找並移除此任務。

-----

### 5\. 日誌 (Logging)

所有由**排程** (`cron`)
或由 `start`
命令**立即觸發**的腳本執行，其日誌都會被統一導向到**單一個檔案**中。

  * **日誌檔位置**: `private/logs/extend_daily_trials.log`

此日誌檔會捕捉所有資訊，包含：

  * `scripts/extend_daily_trials.ts`
    中輸出的所有 `INFO` 訊息（例如：`SUCCESS: Extended Team ID...`）。
  * `scripts/extend_daily_trials.ts`
    中輸出的所有 `ERROR` 訊息（例如：`FAILED: Could not create...`）。
  * 任何由 `npx tsx` 或 Node.js
    本身拋出的執行錯誤（例如 `ERR_UNKNOWN_FILE_EXTENSION`
    或資料庫連線錯誤）。