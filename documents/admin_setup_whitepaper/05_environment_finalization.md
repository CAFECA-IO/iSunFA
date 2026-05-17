# 第 5 章：環境網域配置與狀態封裝 (Environment Finalization)

## 1. 架構定位

在 iSunFA 的自動化初始化流程中，第 7 階段「外部網域與 API 配置 (Domain Config)」與最後的第 8 階段「環境簽章封裝 (Finalize Env)」是系統從「草稿狀態 (Setup Mode)」過渡到「正式鎖定狀態 (Locked Mode)」的關鍵。這兩步確保了系統所有外部依賴皆已就緒，並透過密碼學手段將設定檔永久封裝，達成「零捏造」的最終防護。

## 2. Stage 7: 網域與外部 API 配置 (Domain Config)

iSunFA 是一個深度依賴多個外部服務（如 AI 解析、地圖圖資、綠界金流）的企業級應用。在 Stage 7 中，系統會將這些外部金鑰統一寫入 `.env.setup` 的 `# PART 5: External API Configuration` 區塊，實作位於 `src/services/setup.env.service.ts` 的 `saveExternalConfig()`。

配置的核心參數包含：
*   **基礎應用層**：`NEXT_PUBLIC_APP_URL` (決定 CORS 與 SSO 回撥的基礎網域)。
*   **AI 處理管線**：`GEMINI_API_KEY` 與 `MODEL` (預設為 `gemini-2.5-pro`)，這些是支撐「憑證萃取」與「混合決策管線」的心臟。
*   **分析與圖資**：`NEXT_PUBLIC_GA_MEASUREMENT_ID` (流量分析) 與 `NEXT_PUBLIC_MAPTILER_KEY` (ESG 軌跡視覺化圖資)。
*   **金流整合**：`OEN_ACCESS_TOKEN` 與 `OEN_MERCHANT_ID`，用於支援企業級的法幣/信用卡入金與點數購買。
*   **本地儲存目錄**：`REPORT_OUTPUT_DIR`, `MISSION_DIR`, `ISSUE_DIR` (預設為相對目錄 `reports`, `missions`, `issues`)，確保 ESG 報表與審計軌跡的落地位址。

這些參數在寫入時，後端會自動過濾並使用 `updateOrAppendEnv` 確保變數名稱與值的格式正確，避免 `.env` 出現語法錯誤。

## 3. Stage 8: 防篡改環境封裝 (Finalize Environment)

Stage 8 是 iSunFA 零信任架構的最終防線。系統不再將設定檔視為單純的文字檔，而是將其轉換為一份「具備不可否認性」的密碼學憑證。

### 3.1 封裝與鎖定流程

1.  **穩定化處理與雜湊挑戰 (Hash Challenge)**
    當進入 Stage 8 時，後端會呼叫 `getEnvHashChallenge()`，讀取 `.env.setup` 中的所有變數，排除簽章自身的欄位，並將其餘的變數按照字母順序 (Alphabetical Order) 進行排序（Stable Stringification）。
    接著，對此穩定字串進行 `SHA-256` 雜湊計算，將結果轉換為 `base64url` 格式，作為 FIDO2 認證的 **Challenge (挑戰碼)**。

2.  **實體硬體簽署 (Hardware Auth)**
    前端介面會呼叫 WebAuthn API，要求 Super Admin 使用在 Stage 6 註冊的實體硬體金鑰（Touch ID、YubiKey 等）對這組 Challenge 進行簽章。這確保了「鎖定環境」的這個動作，是由合法擁有該硬體金鑰的真人所授權的。

3.  **簽章寫入 (Write Signature)**
    簽署完成後，後端透過 `verifyAndFinalizeConfig()` 將包含 ClientData 與 AuthenticatorData 的 FIDO2 JSON 物件編碼為 Base64 字串，寫入至 `# PART 6: Configuration Immutable Signature via FIDO2` 區塊的 `SUPER_ADMIN_SIGNATURE` 欄位中。

4.  **草稿銷毀與正式覆蓋 (Commit & Cleanup)**
    最後，`finalizeSetupEnvironment()` 會將封裝好的 `.env.setup` 正式重新命名並覆寫為 `.env`，隨後**徹底刪除 `.env.setup` 草稿檔**。
    系統至此進入「鎖定狀態 (Locked Mode)」。

### 3.2 系統重啟與生效 (System Reboot)

封裝完成後，頁面會跳轉至 `/admin/reboot`。這個動作會對伺服器（PM2 或 Node.js Process）發出重啟信號。
伺服器重啟後，一啟動便會觸發 `validateEnvDetailed()`（如第 1 章所述），它會讀取新的 `.env`，重算雜湊並比對 `SUPER_ADMIN_SIGNATURE`。一旦驗證通過，便代表 iSunFA 系統已經準備好以 Big 4 級別的合規狀態，開始為企業服務。
