# 費思個人化記憶 (Faith Personal Memory) 規範

> **Date**: August 2026
> **Author**: Luphia
> **Version**: 1.0 (Draft)
> **Status**: Proposed — 實作中，**須於 v0.13.0 釋出前完成**
> **Target**: `src/services/faith_chat.service.ts`、`src/repositories/faith_memory.repo.ts`（新）、`src/services/cron/faith_memory_retention.cron.ts`（新）
> **對外承諾出處**：服務條款 §3.7、《隱私權政策》§5、訂閱方案頁「關於費思的專屬記憶」
> **關聯文件**：[團隊錢包與訂閱額度設計書 §5.3](../team_wallet_and_subscription_quota.md)、[ADR 018 人事個資分級與欄位級加密](../decisions/018_hr_pii_data_classification.md)、[LLM 實作規範](llm_implementation_guideline.md)

---

## 1. 為什麼需要這份規範

條款與方案頁已經寫了（2026-08-12），功能還沒有。這是刻意的順序：**先把對外承諾寫定，再依承諾反推技術義務**，避免實作完成後才發現做出來的東西與條款講的不是同一回事。

因此本規範的第一節不是架構圖，而是一張**承諾 → 技術義務**對照表。表中每一項都是 v0.13.0 的驗收條件；任一項未完成，條款所述權益即不得對外宣稱。

| # | 對外承諾（條款 §3.7 / 隱私政策 §5 / 方案頁） | 技術義務 | 落點 |
|---|---|---|---|
| 1 | 每位成員擁有**獨立**的費思代理人，不與其他成員或客戶共用 | 記憶以 `(userId, teamId)` 為鍵隔離；Repo 層強制帶鍵，無「查全部」入口；組 prompt 時只帶本人記憶 | §3、§6 |
| 2 | 費思會記錄回饋與偏好，**隨使用逐步記住需求** | 對話後以 temperature 0 + `responseSchema` 萃取結構化偏好；上限與去重為決定論規則 | §4 |
| 3 | 記憶**僅用於改善您個人體驗**，不用於訓練共享模型 | LLM 呼叫不得帶入他人記憶；供應商端訓練關閉（既有 DPA） | §6 |
| 4 | 停止訂閱起算保留 **90 天**，期間內恢復可延續 | 訂閱終止時寫入 `expiresAt = 終止日 + 90 天`；恢復訂閱清空該欄位 | §7 |
| 5 | 90 天屆滿**刪除**記憶 | 每日守護行程硬刪除到期記憶 + 寫刪除稽核；失敗告警不靜默 | §7 |
| 6 | 可**不待期滿隨時要求刪除** | `DELETE /api/v1/user/faith_memory`（本人）立即硬刪 | §7 |
| 7 | **免費版不提供**個人化記憶 | 讀寫兩側皆以有效方案 gate（`resolveEffectivePlanId`），免費版不寫入亦不讀取 | §6 |

> ⚠️ 第 4–6 項是**隱私承諾**，不是功能特性。做不到的後果不是「少一個功能」，而是條款不實。

---

## 2. 現況（實作前提）

| # | 事實 | 對本規範的影響 |
|---|---|---|
| 1 | 費思目前是**無記憶 one-shot**：`ChatService.generateFaithResponse()` 不帶歷史、不帶 RAG（設計書 §5.3 估價依據即以此為前提） | 記憶是全新資料流，非改寫既有流程 |
| 2 | 費思已綁帳本：`POST /api/v1/chat` 收 `accountBookId`，扣費團隊由 `AccountBook.teamId` 推導（設計書 §5.3「使用前提」） | 記憶的 `teamId` 與計費同源，無需另建推導規則 |
| 3 | 計費為**預扣—結算**，`estimateFaithHoldCredits()` 的 hold 必須是成本上界（只退不補） | 記憶注入會增加 input tokens，**預扣公式必須加計**，否則不變式破裂（見 §5） |
| 4 | 訂閱狀態已有決定論來源：`TeamSubscription.currentPeriodEnd` + `resolveEffectivePlanId()`；到期降級由 `subscription_expiry.cron.ts` 執行 | 90 天起算點掛在既有到期流程上，不另建訂閱狀態機 |
| 5 | 已有欄位級加密樣板：ADR 018（AES-256-GCM、版本化金鑰、密文與列綁定） | 記憶加密沿用同一套，不重造 |

---

## 3. 領域模型

### 3.1 記憶的作用範圍：`(userId, teamId)`，不是純 per-user

條款寫「每位成員擁有獨立的代理人」，最直覺的實作是 per-user 一份全域記憶。**本規範刻意不採**，理由三點：

1. **刪除觸發必須與作用範圍同鍵**：90 天起算點是「**團隊的**付費訂閱終止」。若記憶為全域 per-user，而該用戶同時屬於 A（付費，仍在訂閱）與 B（付費，剛終止）兩個團隊，「該不該刪」就沒有決定論答案——刪了侵害 A 的權益，不刪就違反對 B 的承諾。
2. **避免跨團隊資訊外溢**：會計事務所一位成員常同時服務多家客戶（多團隊、多帳本）。把 A 客戶的科目慣例與說明偏好帶到 B 客戶的對話裡，是實質的資訊外洩，即使兩邊都是同一位使用者。
3. **與計費同源**：`teamId` 已由帳本推導（§2 事實 2），記憶不需要新的歸屬規則。

> 條款 §3.7 已同步補上一句：屬於多個團隊時，各團隊之記憶分別獨立，並各自依該團隊之訂閱狀態計算 90 天期間。**規範與條款必須同時修改**，不得只改一邊。

### 3.2 Prisma 增量（草案）

```prisma
model FaithMemory {
  id String @id @default(uuid())

  // Info: 記憶的作用範圍：一位成員在一個團隊內一份（見 §3.1）
  userId String @map("user_id")
  teamId String @map("team_id")

  /**
   * Info: 記憶項目密文（AES-256-GCM，比照 ADR 018 欄位級加密）。
   * 明文結構為 IFaithMemoryItem[]（見 §4.1），整包加密而非逐條加密：
   * 記憶一律整包讀取用於組 prompt，逐條加密只是多存 N 組 IV 與標籤。
   */
  itemsCipher String @map("items_cipher") @db.Text
  itemsIv     String @map("items_iv")
  itemsTag    String @map("items_tag")
  keyVersion  Int    @map("key_version")

  // Info: 條目數（明文計數，供上限判斷與後台觀測，不含任何內容）
  itemCount Int @default(0) @map("item_count")

  /**
   * Info: 到期刪除時點（訂閱終止日 + FAITH_MEMORY_RETENTION_DAYS）。
   * null = 訂閱有效中，不排定刪除；恢復訂閱時清回 null（見 §7）。
   * 期限「算好存下來」而非每次推導：推導點一多，條款承諾的日期就會出現兩種算法。
   */
  expiresAt DateTime? @map("expires_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
  // Info: 保留期守護行程的掃描索引（WHERE expires_at <= now）
  @@index([expiresAt])
  @@map("faith_memory")
}
```

刪除稽核另存一列，且**不得含記憶內容**（否則「刪除」等於搬家）：

```prisma
model FaithMemoryDeletionLog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  teamId    String   @map("team_id")
  itemCount Int      @map("item_count")
  reason    String   // RETENTION_EXPIRED | USER_REQUEST | ACCOUNT_TERMINATED | TEAM_DISSOLVED
  deletedAt DateTime @default(now()) @map("deleted_at")

  @@index([userId, teamId])
  @@map("faith_memory_deletion_log")
}
```

`reason` 為 `enum`（`src/constants/faith_memory.ts`），不寫字面字串（CLAUDE.md §3）。

---

## 4. 記憶生成：LLM 只做萃取

### 4.1 記憶項目結構

```typescript
interface IFaithMemoryItem {
  category: FaithMemoryCategory; // enum，見下
  statement: string;             // 一句話的偏好陳述，上限 200 字元
  sourceClientMessageId: string; // 來源訊息，供用戶查證與爭議追溯
  updatedAt: number;             // epoch 秒，淘汰與去重用
}
```

`FaithMemoryCategory`（`src/constants/faith_memory.ts`）：`ACCOUNTING_PREFERENCE`、`REPORT_FORMAT`、`ANSWER_STYLE`、`TERMINOLOGY`、`DOMAIN_CONTEXT`。**封閉列舉**，由 `responseSchema` 的 `enum` 約束，不接受自由字串——否則分類會隨模型心情長出無限多種。

### 4.2 萃取規則（決定論邊界）

- **Temperature = 0 + `responseSchema`**，禁止自由格式 + regex 硬抓（CLAUDE.md §7）。
- **只記「用戶明示」的偏好與回饋**，禁止推測。prompt 明確要求：無明示偏好時回空陣列——「這輪沒東西可記」是正常結果，不是失敗。
- **嚴禁記入數值型事實**：金額、餘額、稅率、排放係數一律不進記憶。這類數字的唯一真相在 DB 與規則引擎；記進記憶等於讓 LLM 當事實資料庫（CLAUDE.md §7），且會在數字變動後持續複述錯誤值。萃取後以確定性檢查攔下含金額樣式的 `statement`。
- **上限與淘汰**：每 `(userId, teamId)` 最多 `FAITH_MEMORY_MAX_ITEMS`（建議 50）。超限時淘汰 `updatedAt` 最舊者（LRU，決定論）。無上限的記憶會讓 prompt 無止境膨脹，直接反映在每輪扣點上。
- **去重**：同 `category` 且 `statement` 正規化後（去空白、統一全半角、轉小寫）雜湊相同 → **更新** `updatedAt` 而非新增。刻意不做語意相似度比對：那不決定論，且同一句話兩次萃取可能一次判重、一次沒判。
- **萃取失敗不影響回覆**：萃取在回覆送出後以背景任務執行，失敗僅記 log，絕不讓「記憶沒寫成功」變成用戶看不到答案。

---

## 5. 讀取與注入：與計費的交互（必改項）

注入流程：組 prompt 前讀取本人記憶 → 依 `updatedAt` 由新到舊填入，直到 `FAITH_MEMORY_PROMPT_TOKEN_BUDGET`（建議 400 tokens）為止。

**這裡有一個會破壞既有不變式的細節。** 現行預扣估算（`src/lib/faith_billing.ts`）為：

```
inputEstimate = FAITH_PROMPT_OVERHEAD_TOKENS + ceil(messageLength / 3) + (hasImage ? imageInputTokenEstimate : 0)
```

記憶注入會讓真實 input tokens 高於此估算，於是 `hold` 不再是成本上界，`settleSpend()` 的「actual ≤ held、只退不補」前提就會出現 actual > held 的情況——依現行實作那會**收斂為不退款**（等於系統自行吸收差額，且帳面上看不出原因）。

**修正（v0.13.0 必做）**：`estimateFaithHoldCredits()` 增加記憶注入的 token 上界參數，把 `FAITH_MEMORY_PROMPT_TOKEN_BUDGET` 加進 `inputEstimate`。注入預算是**硬上界**（超過即截斷），因此估算仍為上界，不變式維持。

> 副作用要對用戶誠實：記憶使每輪的輸入變長，扣點會略增（以 400 tokens 預算、1 點 = 1,000 tokens 計，最多多扣 1 點）。方案頁與條款不揭露費率數字（產品調整 20260809），故此處不新增文案，但點數歷程的實耗 tokens 已可查驗。

---

## 6. 隔離、加密與方案 Gate

### 6.1 隔離

- Repo 層所有讀寫一律以 `(userId, teamId)` 為必要參數，**不提供** 依 `userId` 或 `teamId` 單邊查詢的方法；沒有「列出全部記憶」的入口。
- 呼叫 LLM 時只帶本人記憶。管理者（OWNER / ADMIN）**不得**讀取成員記憶——團隊錢包的管理權不延伸到成員的對話偏好。

### 6.2 加密：伺服器持鑰的欄位級加密，不採 E2EE

碳盤查那套全程 E2EE 在此**做不到**：server 必須在組 prompt 時讀到記憶明文。若改為由 client 解密後注入，記憶就變成前端可任意篡改的輸入，且換裝置即失憶——兩者都比「伺服器持鑰」更糟。

因此沿用 ADR 018 的欄位級 AES-256-GCM（版本化金鑰、密文與列綁定）。分級為 **CONFIDENTIAL**：加密、不遮罩、**讀取不逐次稽核**（每輪對話都要讀，逐次稽核的量與價值不成比例），但**刪除必寫稽核**（§3.2）。

### 6.3 方案 Gate

讀寫兩側都以 `resolveEffectivePlanId(subscription, nowSec) !== TEAM_PLAN.FREE` 判定，fail-closed：查無訂閱、狀態非 ACTIVE、或已過期一律視為免費版，不寫入也不讀取。單邊 gate 會造成「免費版讀得到舊記憶」或「免費版寫得進去」的破口。

---

## 7. 保留與刪除（90 天）

保留天數的單一來源為 `FAITH_MEMORY_RETENTION_DAYS`（`src/constants/llm.ts`，現值 90），條款、隱私政策與方案頁文案皆以此為準；修改須同步四處。

### 7.1 期限的寫入與清除

| 事件 | 動作 |
|---|---|
| 訂閱到期未續訂 / 取消自動續訂後當期屆滿 / 降級為免費版 | `expiresAt = 終止日 + 90 天`（由 `subscription_expiry.cron.ts` 降級流程同步寫入） |
| 90 天內恢復付費訂閱 | `expiresAt = null`，記憶延續 |
| 團隊解散 | 立即硬刪（`reason = TEAM_DISSOLVED`），不等 90 天——團隊已不存在，保留無正當目的 |
| 帳戶終止 | 依條款 §9 之 30 天寬限期辦理；與 90 天並存時以**較早屆至者**為準 |
| 用戶主動要求 | 立即硬刪（`reason = USER_REQUEST`） |

### 7.2 刪除守護行程

`src/services/cron/faith_memory_retention.cron.ts`，每日 03:00（避開既有 02:00 匯率排程）：

1. 掃 `expiresAt <= now` 的記憶列；
2. **硬刪除**（`DELETE`，非 soft delete）。條款承諾的是「刪除」，留一筆 `deletedAt` 不算刪除；
3. 寫 `FaithMemoryDeletionLog`（不含內容）；
4. 失敗重試 3 次仍失敗 → 進 DLQ 並**告警**（CLAUDE.md §6）。這裡的失敗是合規風險，不是背景雜訊，絕不可靜默略過。

守護行程未跑到的間隙不構成違約（承諾為「屆滿後刪除」），但讀取側仍應以 `expiresAt` 判定：**已過期的記憶即使尚未被刪，也不得注入 prompt**。fail-closed 的順序永遠是先停止使用，再實際刪除。

---

## 8. 檔案清單（三層架構對照）

| 層 | 檔案 | 職責 |
|---|---|---|
| Constants | `src/constants/faith_memory.ts`（新） | `FaithMemoryCategory`、刪除原因 enum、上限與注入預算 |
| Constants | `src/constants/llm.ts` | `FAITH_MEMORY_RETENTION_DAYS`（已建立） |
| Interfaces | `src/interfaces/faith_memory.ts`（新） | `IFaithMemoryItem`、DTO |
| Validators | `src/validators/faith_memory.ts`（新） | 萃取輸出 schema、刪除請求 schema |
| Repository | `src/repositories/faith_memory.repo.ts`（新） | 唯一碰 DB 的層；讀寫一律帶 `(userId, teamId)`；加解密於此收斂 |
| Service | `src/services/faith_memory.service.ts`（新） | 方案 gate、上限與去重、注入組裝、刪除編排 |
| Service | `src/services/faith_chat.service.ts` | 注入記憶、對話後觸發背景萃取 |
| Lib | `src/lib/faith_billing.ts` | 預扣估算加計記憶注入上界（§5） |
| Cron | `src/services/cron/faith_memory_retention.cron.ts`（新） | 每日到期刪除 + 稽核 + 告警 |
| API | `src/app/api/v1/user/faith_memory/route.ts`（新） | `GET`（本人檢視）、`DELETE`（本人刪除）；純端口 |

---

## 9. 分階段與 v0.13.0 Release Gate

| 階段 | 內容 | 完成判準 |
|---|---|---|
| **P0**（已完成 2026-08-12） | 條款 §3.7、隱私政策 §5、方案頁文案、保留天數常數、本規範 | 三處文案的天數同源、法務確認中 |
| **P1** | Schema + migration + Repo（含加解密）+ 方案 Gate | 免費版讀寫皆被擋；跨用戶讀取無 API 可達 |
| **P2** | 萃取管線 + 注入 + **預扣估算修正** | 萃取為封閉列舉、含金額樣式的項目被攔下；`actual ≤ held` 不變式在含記憶時仍成立（單測） |
| **P3** | 刪除守護行程 + 提前刪除 API + 稽核 + 告警 | 到期記憶被硬刪且留稽核；過期未刪的記憶不會被注入；Worker 失敗會告警 |
| **P4** | UI：記憶檢視與一鍵清除 | 用戶能自行查看費思記住了什麼並刪除 |

> **Gate：P1–P3 全數完成且有測試覆蓋前，條款 §3.7 與方案頁的「專屬記憶」不得對外發布。** P4 可於 v0.13.0 後補（隱私法規之存取權在 P3 的 `GET` 端點已可透過客服流程滿足），但不建議延後太久——用戶看不到「AI 記住了什麼」，信任成本會比實作成本高。

---

## 10. 開放問題（實作前需拍板）

1. **90 天是否改為 DB 系統設定**：目前為程式常數。若營運需調整（如不同市場的法規期限），須依 ADR 017 搬入簽章式系統設定表，並同步條款「以本服務內公告為準」的寫法。
2. **記憶是否跨帳本共用**：本規範定為 `(userId, teamId)`，同團隊內跨帳本共用。若客戶要求「一帳本一記憶」，鍵改為 `(userId, accountBookId)`，刪除觸發需另定（帳本刪除 vs 訂閱終止）。
3. **記憶是否可編輯**（而非只能刪除）：編輯能提升準確度，但也讓用戶可寫入任意文字進 prompt——需評估注入攻擊面。
4. **免費版曾是付費版的殘留記憶**：降級後 90 天內若用戶不再付費，期間記憶「保留但不可用」（§6.3 gate + §7 讀取側判定）。此設計是為了「恢復訂閱即延續」，但也意味著資料保留了 90 天卻不提供任何功能——須確認法務認同此保留具正當目的。
