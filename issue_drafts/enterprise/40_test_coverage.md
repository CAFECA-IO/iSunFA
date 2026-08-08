# [P3] 測試補齊:route 整合測試、hook 測試、carbon E2E

## 問題

零覆蓋:6 個 route handler(授權/所有權裁決/樂觀鎖/降級路徑)、`use_carbon_chat.ts`、
`chatroom.service.ts`、repos;無 carbon E2E。
P0/P1 各 issue 的新測試由各自 issue 承擔,本 issue 補「存量缺口 + 整條 E2E」。

### 盤點數字(2026-08-06 實測)

原本寫的「4 支 unit test / 1267 行」是開票當時的數字,兩者都已過期 ——
純函數與 lib 那一側其實已經很厚,真正的缺口是**種類**而不是數量:

| 指標 | 開票時寫 | 2026-08-06 實測 |
| :-- | --: | --: |
| 測試檔(`src/__tests__/`) | 4 | **63** |
| 測試檔(全 repo,含 `src/lib/utils/__tests__` 等) | — | 79 |
| 其中 carbon 相關 | 4 | 22 |
| **route handler 測試** | 0 | **0**(`grep -rln 'from "@/app/api' src --include='*.test.ts'` 零命中) |
| **React hook 測試** | 0 | **0**(`renderHook` 零命中;`@testing-library/*` **未安裝**) |
| `use_carbon_chat.ts` 行數 | 1267 | **4164** |

兩點會影響排程:

1. **hook 測試要先加依賴**(`@testing-library/react` + `@testing-library/dom`),
   那是這張票的第一個動作,不是寫測試。
2. **`use_carbon_chat.ts` 已膨脹到 4164 行**,直接測它的成本遠高於原估。
   已驗證可行的替代路徑:把不變式抽成純函式再測 ——
   `use_carbon_chat.helpers.ts` 的 `splitReportMarkdownSections` / `alignReportSections` /
   `patchMarkdownSection` / `reduceDraftNotice` 都是這樣測到的
   (`carbon_report_markdown.test.ts`、`carbon_draft_notice.test.ts`)。
   凡是能抽成純函式的不變式都該走這條;真正需要 renderHook 的只剩
   「effect 時序」與「多聊天室隔離」那幾條。

第 3 項(chat.service)**已由別的 issue 消化**:`llm_gateway.test.ts` 蓋 gateway/quota 分類,
`carbon_chat_gateway_timeout.test.ts` 蓋重試與 timeout(對應 enterprise/10)。

## 實作辦法

1. **Route 整合測試**(`src/__tests__/api/carbon_*.test.ts`,mock repo/LLM/Centrifugo,不 mock validator 與裁決邏輯):
   - 六個 route × 授權矩陣:無 DeWT 401、他人 channel 403(`isCarbonChatChannelOwnedBy`)、合法 200
   - report PUT 版本衝突 409;chat 的 LLM 失敗/quota/drafts 內嵌路徑;attachment 的 Fail Fast 順序
2. **Hook 測試**。前置動作:安裝 `@testing-library/react`(目前 **未安裝**)。
   能抽成純函式的不變式一律走純函式(見上方說明),
   下列只保留真的需要 renderHook 的(`renderHook` + fake timers,mock fetch/crypto):
   - 多聊天室隔離(busy/timer 不互漏)、autosave debounce 與凍結條件(API 失敗不註冊 version)
   - 三態草稿還原(null/可讀/不可讀)、envelope 去重、draftNotice 生命週期
3. ~~**chat.service 測試**:enum 白名單裁決、結構化回覆 fallback、`isLlmQuotaError` 分類、重試/timeout。~~
   **已完成**(由 enterprise/10 消化):`src/__tests__/llm_gateway.test.ts`、
   `src/__tests__/carbon_chat_gateway_timeout.test.ts`。
4. **Carbon E2E**(`src/__tests__/e2e/carbon_chatbot.e2e.test.ts`,測試帳本一律 `e2e-book-` 前綴):
   完整劇本 — 建會話 → 送訊息(mock LLM 決定性回覆)→ 活動數據入帳 → CO2e 計算 → 守恆違反凍結 → 補數據解凍 → 報告數據段落 → 版本衝突 → 刪除會話。斷言最終 Decimal 總計與手算基準一致(對齊 e2e_audit_pipeline 盲測精神)。
5. **測試基建**:共用 factory(`buildDewtHeader`/`buildEnvelope`/`buildActivityRecord`),清掉各測試檔重複 mock。

## 依賴

P0/P1 全部完成後執行(E2E 劇本覆蓋其產物)。

## 驗收

- `npm test` 全綠;carbon 相關 statement coverage ≥ 80%(jest --coverage 圈定 carbon 檔案)
- E2E 不污染真實資料(前綴檢查);CI 時間增幅 < 2 分鐘
- 既有「worker process failed to exit gracefully」洩漏警告一併排查(`--detectOpenHandles`)
