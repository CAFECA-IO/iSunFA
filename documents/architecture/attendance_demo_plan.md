# 🎬 簽到系統 Demo 開發計劃書 (Time & Attendance Demo Plan)

> **Date**: 2026-08-13
> **Author**: Julian
> **Version**: 2.1
> **Status**: 📝 Draft
> **母文件**: `documents/architecture/time_attendance_module_plan.md`（v1.2）
> **Base**: `develop` @ `9757e21e8`
> **目標**: 演示「Google 登入 → GPS 打卡 → 工地現場人數與名單」與「班表 → 自動比對 → 出勤異常」兩段完整故事。
> **展示對象**: **工程主管機關**（v2.1 起）
> **展示資料**: `documents/architecture/attendance_demo_mock_data.md`
> **執行手冊**: `documents/architecture/attendance_demo_runbook.md`（座標校準、現場故障處置、備援分級）
> **演示地點**: 新北市

> **v2.1 變更摘要**（相對 v2.0）：**確定展示對象為工程主管機關**
>
> 對這個聽眾，這套系統回答的不是「員工幾點到辦公室」，而是**出工查核**與**工安點名**。功能沒變，敘事與資料換了：
>
> 1. **P3 重新定位**為「工地現場人數與出工查核」，「應到未打卡」改稱 **「未到工」** 並提升為主要指標（§8.2）—— 排了班沒打卡＝系統自己算出來的出工差異，這是機關最在意的數字。
> 2. **多工地**：4 個地點（1 本部 + 3 工區）取代原本的單一辦公室，地圖才有「機關管轄多個工地」的樣子。
> 3. **加回現場名單匯出**（A10，+0.25 天）—— 工安事故點名對這個聽眾是 killer feature，成本只是一支 CSV。
> 4. **500 公尺圍欄對工區是合理值**，不再只是「demo 專用的寬鬆值」（§3.1）。
> 5. ⚠️ **發現 schema 缺口：`WorkDayType` 沒有「停工」**。因雨／颱風停工既非例假、非休息日、非國定假日、非請假，卻是工程業常態。demo 暫借 `HOLIDAY`，正式版建議新增 `SUSPENDED`（§5.1、§12.3）。
> 6. 職稱與組織改為工程單位體系（工地主任、工地工程師、監造、品管、職安…），詳見展示資料文件。
> 7. 時程 10.5 → **11 天**。

> **v2.0 變更摘要**（相對 v1.1）
>
> 依需求加入**排班、彈性工時、遲到早退曠職判定**。這不是加三個功能，是讓 demo 從「一段」變成「兩段」——
> 因此 §1 重寫為兩段式敘事、§11 演示腳本重排、時程由 5 天調整為 **10.5 天**（單人序列估算；W4 可與 W2/W3 併行，兩人分頭做前後端可壓到約 7 天）。**v2.1 因加入名單匯出與較複雜的展示資料，調整為 11 天。**
>
> 三個因為擴充而**變好**的地方：
> 1. **`presenceStaleGraceMinutes` 可以用正式版語意了** —— 有了班別窗迄當基準點，v1.1 那段 `isStaleForDemo` 的 hack **整段刪除**（§3.2）。
> 2. **彈性工時幾乎不用額外開發** —— 母文件 §D1 的統一班別模型讓「固定班 = 窗＝核心」，加 `ShiftPattern` 一張表同時得到兩種制度（§6.1）。
> 3. **§D10.3 剛補完的「`STALE` vs `MISSING_CLOCK_OUT` 分工」現在演得出來了** —— 同一件事的即時面與事後面，在 demo 裡分別出現在兩個畫面（§11 步驟 11）。

---

## 🎯 1. Demo 要證明的五件事（分成兩段講）

v1.1 的原則是「三個主張講清楚，比八個功能各講一半有用」。加入班表與判定之後，主張變成五個 —— **解法不是講快一點，是分成兩段，每段只有一個主題**。

這兩段的目標聽眾本來就不同：第一段講給**工務與職安**（出工查核、事故點名），第二段講給**主管與稽核**（工時制度、差異管理）。

### 第一段：「工地上現在有誰」（約 4 分鐘）— 即時、有畫面、講現場

| # | 主張 | 演示方式 |
|---|---|---|
| **P1** | 員工用既有的公司 Google 帳號就能簽到 | 點「使用 Google 登入」→ 打卡畫面顯示自己的姓名與工號 |
| **P2** | **人不在現場就打不了卡** —— 圍欄是到班的定義，不是事後標記 | 辦公室打卡成功；切換遠處座標 → **403「距台北總部 3.2 公里」** |
| **P3** | 系統隨時答得出「**哪個工地現在有幾個人、分別是誰、誰排了班卻沒到**」 | 現場頁：多工地地圖 + 在班／未到工／未打下班卡三個數字 + 名單；第二人打卡 → 名單即時多一人 |

### 第二段：「出勤對不對得上」（約 5 分鐘）— 制度、規則、講管理

| # | 主張 | 演示方式 |
|---|---|---|
| **P4** | **一套班別模型同時支援固定班與彈性工時，判定引擎沒有任何分支** | 兩位同仁同樣 09:47 打卡：固定班的**遲到 47 分**、彈性班的**正常**。然後打開程式碼，指出沒有 `if (shiftType)` |
| **P5** | 系統自動比對班表與打卡，標出遲到、早退、曠職、漏打卡 | 出勤總覽頁：一個月 × 5 人的方格圖，異常標色；點開看分鐘數 |

### 1.1 為什麼 P4 值得花時間講

P5 是任何一套考勤系統都有的功能。**P4 才是這套系統與眾不同的地方**，而它完全看不見 —— 除非有人指出來。

母文件 §D1 的結論是：固定班表是「彈性窗收縮到與核心時間重合」的彈性班表。因此：

- 資料庫**沒有** `shiftType` 欄位（有的話它唯一能做的事就是說謊）
- 判定引擎**沒有** `switch`，四條規則覆蓋兩種制度
- 未來加第三種制度時，**改的是資料不是程式碼**

對技術聽眾（CTO、架構師、要評估這套系統能不能長期維護的人），這一點的說服力遠高於再多演示一個畫面。**演示時務必把程式碼投出來** —— 這是唯一能證明「沒有分支」的方式。

### 1.2 Demo 仍然不演示

補打卡申請單、多帳本、權限矩陣、稽核軌跡、限流、緊急點名匯出、瞬移偵測 (G5)、網段驗證 (G4b)。

其中**補打卡申請單是最需要說明的一項**：母文件 §D9 指出，圍欄外一律拒絕之後，補登單從「忘記打卡的補救」升格為「外勤到班事實的唯一入口」。它在正式版是一級功能，但它是一條**流程**（申請 → 通知 → 簽核 → 重算），在 demo 的十分鐘裡演不完整，演一半反而讓人以為系統沒有處理外勤。

> **建議在演示第二段結尾用一句話帶過**：「打卡有異常時，員工線上填補登單、主管確認後系統自動重算 —— 這部分在正式版。」

---

## 🔍 2. 現況盤點：Google 登入**已經做完了**

現 branch 已具備完整的 Google OIDC 登入，**demo 不需要寫任何一行 OAuth 程式碼**：

| 層 | 既有資產 | 狀態 |
|---|---|---|
| Provider | `src/lib/auth/oauth/google.provider.ts` | ✅ OIDC + JWKS 驗簽 + `id_token` claim 型別守衛 |
| Registry / State | `src/lib/auth/oauth/registry.ts`、`state_token.ts`（TTL 5 分鐘） | ✅ |
| Service | `src/services/oauth.service.ts`（`completeLogin`：既有身分登入、首登建帳、併發競態處理） | ✅ |
| API | `/api/v1/auth/oauth/[provider]/start`、`/callback`、`/link`、`/providers` | ✅ |
| 資料 | `model UserIdentity`（`@@unique([provider, providerUserId])`）、`UserCustodialKey` | ✅ |
| 常數 | `src/constants/auth_provider.ts`（`AuthProvider.GOOGLE`、`WalletCustodyType`） | ✅ |
| **前端** | `src/components/auth/social_login_buttons.tsx`、`auth_modal.tsx`、`/auth/callback/[provider]/page.tsx` | ✅ **按鈕已經在畫面上** |
| 憑證來源 | `SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID` / `_CLIENT_SECRET`（簽章式系統設定，ADR 017），可由 env 帶入 | ✅ |

**Demo 在登入這一塊的全部工作是設定，不是開發**：到 Google Cloud Console 開一組 OAuth 用戶端、redirect URI 設成 `${NEXT_PUBLIC_APP_URL}/auth/callback/google`、client id/secret 灌進系統設定。

> `social_login_buttons.tsx` 的註解已寫明：「只渲染後端回報『已完成設定』的 provider，因此未設定金鑰的環境不會出現壞掉的按鈕。」——**設定完成之前，Google 按鈕根本不會出現。** 這是檢查清單第一項（§10.1）。

### 2.1 ⚠️ 但是：`User` 與 `Employee` 之間沒有任何連結

這是 demo 唯一真正的身分工作，也是母文件尚未處理的缺口。

```
User            ──identities──▶  UserIdentity (provider=GOOGLE, email=…)
  address, name, role, …

Employee        ← 沒有任何欄位指向 User
  employeeNo, name, email(公司信箱，明文), personalEmailCipher(密文), …
```

Google 登入完成後拿到的是一個 `User`。但打卡與班表都掛在 `Employee` 上。**中間沒有橋。**

#### 決策：`Employee.userId String? @unique` + 首登以公司信箱自動綁定

```prisma
/**
 * Info: (20260813 - Julian) 綁定的系統帳號。員工要能自己打卡、查自己的班表與出勤，
 * 就必須能從登入身分找回員工檔——而登入身分是 User，出勤事實掛在 Employee。
 *
 * 可空：員工檔可能先由 HR 建立、本人尚未登入過；@unique：一個帳號只能是一位員工。
 * 綁定方式見計畫書 §2.1——email 比對只是**首次綁定的引導**，綁定本身是這個欄位。
 */
userId String? @unique @map("user_id")
user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
```

**首登綁定流程**（`attendance_identity.service.ts`）：

1. Google 登入完成，取得 `User` 與其 `UserIdentity.email`
2. 該 `User` 已綁定 `Employee` → 直接回傳
3. 否則以 `UserIdentity.email`（須 `emailVerified = true`）比對 `Employee.email`
   - 命中唯一一筆且 `userId IS NULL` → 寫入綁定
   - 命中但已綁給別人 → `CF_EMPLOYEE_ALREADY_LINKED`（409）
   - 未命中 → `NF_EMPLOYEE_FOR_USER`（404），畫面提示「你的 Google 帳號尚未對應到員工檔，請聯繫 HR」

**為什麼 email 比對只能當引導、不能當連結本身**：

- 公司信箱可以變更（改名、部門調動），而打卡與班表歷史不該跟著飄移
- **`Employee.personalEmailCipher` 是密文，DB 端查不了**（ADR 018 §7 已知取捨第 2 條）——只有公司信箱比對得到。用個人 Gmail 登入的人永遠對不上，這是加密的必然結果，不是 bug
- 一旦寫入 `userId`，之後每次登入都走外鍵，不再依賴字串比對

> **Demo 的實際影響**：所有上台的人，Google 帳號必須就是其 `Employee.email`。列在 §10.1 檢查清單。

---

## 📐 3. 參數決定（Q10 / Q11）

### 3.1 Q10：圍欄半徑 = **500 公尺**

```typescript
// src/constants/attendance.ts
// Info: (20260813 - Julian) Demo 期間的圍欄半徑。母計畫 §D6 要求正式上線前實地量測，
// Info: (20260813 - Julian) 500 公尺是「不讓 GPS 漂移擋住演示」的值，不是正式值。
export const DEMO_GEOFENCE_RADIUS_METERS = 500;
```

| | 影響 |
|---|---|
| ✅ **對 demo 有利** | 都市環境瀏覽器定位誤差常在 20–100 公尺，500 公尺讓「站在辦公室任何角落、任何裝置」都打得到卡。**演示最怕的是主角自己打不了卡** |
| ⚠️ **對 P2 演示不利** | 500 公尺在台北市區橫跨數個街廓，走出圍欄要 6–8 分鐘，會毀掉節奏。解法見 §3.3 |
| ✅ **對工區反而合理** | 橋梁工區、廠站的基地範圍加施工便道，500 公尺並不誇張 —— 對工程場景，這個值**接近可用值**而不只是 demo 值 |
| ❌ **對辦公室仍過寬** | 本部辦公室用 500 公尺等於「在對面咖啡廳也算到班」。展示資料因此把 `LOC-HQ` 設為 300、工區設為 500–800（見展示資料 §4） |

> **⚠️ 圓形圍欄對線形工程（道路、管線）本來就不合用** —— 一條 3 公里的管線要用圓涵蓋，半徑得 1.5 公里以上，而那個圓會把沿線大片無關區域算成工地。
> 母文件 §13.2 已把 PostGIS 列為升級路徑，理由是效能；**線形工程是更早也更實質的觸發條件 —— 它不是效能問題，是幾何模型不合用。**
> **建議演示時主動提出**：工程背景的聽眾幾秒鐘就會想到，由我們先講展現的是知道邊界在哪，由他們先問就變成我們沒想到。

### 3.2 Q11：`presenceStaleGraceMinutes` = **3 分鐘**，且**可以用正式版語意**

> 這個參數在解決什麼問題，見母文件 §D10.3。一句話：有人**忘記打下班卡**時，系統不能一直當他在現場（名單只進不出，一週後就廢了），也不能立刻當他不在（他可能真的還在加班）。這個值就是那條線 ——「等多久之後，系統承認自己不知道這個人還在不在」。因此 `STALE` 的語意是「我不知道」，不是「他不在」。

#### ✅ v1.1 的陷阱二消失了

v1.1 因為 demo 沒有班表、不知道誰幾點該下班，被迫把基準點從「班別窗迄」改成「上班打卡時間」，並用 `Deprecated:` 標記一段 `isStaleForDemo()` 要求正式版刪除。

**加入 `ShiftPattern` 之後這個 hack 不需要了** —— demo 可以直接用正式語意：

```
STALE ⇔ now > 班別窗迄 + presenceStaleGraceMinutes 且 無下班打卡
```

**怎麼讓它在演示中發生**：給一位 demo 員工排一個**窗迄就落在演示時段**的班別。若演示排在 14:00，就給他排「早班 06:00–14:00」，14:03 即轉 `STALE`。

> 這比 v1.1 的做法好在三處：不必寫任何 demo 專用程式碼、觀眾看到的是真實邏輯、**demo 後的清理清單少一項**。
> **代價是排班要配合演示時間**，列入 §10.1 檢查清單。

#### ⚠️ 陷阱一仍然存在：不靠 Worker

母文件 §8.2 的判定 Worker 是每小時一次。3 分鐘的狀態轉換在那個節奏下看不到。

**因此 demo 的 `STALE` 與**（新增的）**出勤判定都改為讀取時即時計算**，demo **完全不需要背景 Worker**。理由見 §4.3。

### 3.3 Demo 專用：手動座標開關

要在會議室裡演示 P2，唯一務實的辦法是讓簡報者手動輸入座標。

```typescript
// Deprecated: (20260813 - Julian) [start] Demo 專用：允許以手動座標取代瀏覽器定位。
// 存在的唯一理由是在會議室內演示「圍欄外被拒絕」——實際走出 500 公尺需要 6–8 分鐘。
// 這條路徑等於讓客戶端指定自己的位置，與護欄 G2「圍欄判定在伺服器、client 不參與」直接衝突，
// **正式版必須整段移除**，不是改成預設關閉。
const ALLOW_MANUAL_COORDINATE = process.env.DEMO_ALLOW_MANUAL_COORDINATE === "true";
// Deprecated: [end]
```

三條防護：env 旗標預設關閉且 `.env.example` 標明「正式部署不得設定」；開啟時畫面頂端顯示紅色橫幅；列入 §12.2 清理清單第一項。

> **為什麼不用「調小圍欄半徑」演示**：那會讓主角自己也打不了卡。**為什麼不建一個很遠的假地點**：那演示的是「打卡到別的地點」，不是「圍欄外被拒絕」—— P2 要證明的是拒絕，不是選點。

---

## ✂️ 4. 範圍：砍什麼、留什麼

### 4.1 判準：只砍「需要額外工時」的東西

母文件的許多嚴謹要求**在 demo 階段是零成本、甚至負成本**的：

| 母文件要求 | Demo | 成本 |
|---|---|---|
| `AttendancePunch` append-only（repo 不寫 `update`/`delete`） | ✅ 保留 | **負成本** —— 少寫兩個方法 |
| 伺服器時間權威 G1 | ✅ 保留 | **負成本** —— 少解析一個欄位 |
| 圍欄判定在伺服器 G2 | ✅ 保留 | 零 |
| `id = randomUUID()`（AAD 前置） | ✅ 保留 | 零 |
| **座標欄位級加密**（`encryptPii`） | ✅ 保留 | 極低 —— 呼叫兩次現成函式 |
| `HrPiiTable.ATTENDANCE_PUNCH` 登記 | ✅ 保留 | 零 |
| 圍欄外拒絕 | ✅ 保留 | 零 |
| **`ShiftPattern` 六個欄位全 NOT NULL、無 `shiftType`**（§D1） | ✅ 保留 | **負成本** —— 少一個欄位、少一組分支 |
| **判定引擎為純函數、不碰 DB、不呼叫 `Date.now()`**（§D7） | ✅ 保留 | 零 —— 純函數比不純的好寫 |
| `EmployeeShiftDay` 的 `@@unique([accountBookId, employeeId, workDate])` | ✅ 保留 | 零 —— 一行 |
| `assertSchedulableDay` 不變式（§D2） | ✅ 保留 | 低 —— 六行 |

> **座標加密與純函數引擎絕對不能砍。** 前者：demo 資料庫極可能被留下來當測試資料，明文座標一旦落地就一直在那裡。後者：`attendance_rules.ts` 是本次 demo **唯一一段「寫完就是正式版」的程式碼**，寫得隨便等於正式版要重寫。

### 4.2 砍掉的項目與復原成本

| 母文件項目 | Demo 處置 | 復原成本 | 傷及正式版？ |
|---|---|---|---|
| `ShiftAssignmentRule`（週期性指派） | ❌ 砍。**seed 直接把週期展開成逐日** | 低（1 張表 + 取班順序第 2 步） | ➖ 純新增，見 §4.4 |
| `AttendanceDailyResult` / `AttendanceException` **表** | ❌ **不建表，讀取時即時算** | 低 | ➖ 見 §4.3 |
| `AttendancePresence` 表 | ❌ **不建表，從 punch 推導** | 低 | ➖ 同上 |
| `AttendancePolicy` 表 | ❌ 改為 `src/constants/attendance.ts` 常數 | 低 | ➖ 純新增 |
| `AttendanceCorrectionRequest` 補登單 | ❌ 全砍（§1.2） | 中 | ➖ 純新增 |
| `WorkLocationNetwork`（IP/BSSID） | ❌ 砍。demo 只用 GPS | 低 | ➖ 純新增 |
| 背景 Worker | ❌ **完全不需要** | 低 | ➖ 純新增 |
| 瞬移偵測 G5 / `SUSPICIOUS_JUMP` | ❌ 砍（判定表 12 條中唯一未涵蓋的一條） | 低 | ➖ 純新增 |
| `AuditLog` 寫入 / 限流 | ❌ 砍 | 低 | ➖ 純新增 |
| 存取矩陣 / `attendance_access.guard.ts` | ⚠️ 極簡 | 中 | ⚠️ **見 §12.3** |
| 多語系 i18n | ⚠️ 只做 `zh_tw` | 低 | ➖ |

### 4.3 一條原則，用了三次：**砍掉的是快取，留下的是真相**

Demo 砍掉了三張表 —— `AttendancePresence`、`AttendanceDailyResult`、`AttendanceException`。它們的共同點是**全都可以從真相推導出來**：

| 派生資料 | 真相是什麼 | 母文件為何要落地 | Demo 為何不必 |
|---|---|---|---|
| 現場在班狀態 | `AttendancePunch` | O(1) 讀（每 30 秒查一次全帳本） | 個位數員工，即時推導幾毫秒 |
| 每日判定結果 | `AttendancePunch` + 班表 + **純函數引擎** | 效能 + `engineVersion` 可回溯 | 一個月 × 5 人 = 150 次純函數呼叫，即時算完 |

母文件 §D10.1 自己說過：「『誰現在在班』**完全可由 `AttendancePunch` 推導**……推導是正確的，但每次推導不可行。」

**不可行的理由是效能，而 demo 沒有那個壓力。**

判定結果更乾脆：母文件 §D7 要求引擎是**純函數**，而純函數本來就可以在讀取時呼叫。落地的 `AttendanceDailyResult` 本質上就是這個純函數的快取 —— 它存在的理由是效能與版本追溯，兩者 demo 都不需要。

> 這一刀省下的不只是三張表：還有同交易一致性、`rebuildPresence`、勾稽對帳、`upsert` 冪等、異常子表整批替換、以及整個背景 Worker。
> **而 demo 寫的推導邏輯，正好就是正式版 `rebuildPresence` 與 Worker 內部要呼叫的東西** —— 這筆工不會白做。

### 4.4 為什麼砍 `ShiftAssignmentRule` 而留 `EmployeeShiftDay`

兩張表分別對應母文件 §D2 的兩種指派方式：

- `ShiftAssignmentRule`：週期性規則（週一～五掛 A 班）—— **實務上必要，但演示起來只是一個表單**
- `EmployeeShiftDay`：逐日指派 —— **這才是「排班制」有畫面的那一半**（門市早/中/晚班輪值、月中劃休）

需求裡的「排班制（門市或產線的輪班劃休）」指的正是逐日。因此 demo 只做 `EmployeeShiftDay`，**內勤的朝九晚六由 seed 把週期展開成逐日資料**。

**代價要講清楚**：demo 不會演示到母文件 §D2 的「取當日班表決定論順序」（逐日 → 規則 → `NO_SCHEDULE`）三步驟中的第 2 步。**那一步正是正式版最容易寫錯的地方**（生效區間邊界、weekday 比對、優先權），demo 綠燈不代表它是對的。正式開發時它需要自己的測試（母文件 §11 T8）。

實務上也要說明：正式版不做規則表，HR 就得為每個內勤員工逐日建檔 —— 22 個工作天 × 50 人 = 1,100 筆。**這是 demo 之後第一個必須補上的東西。**

---

## 🗄️ 5. Demo 資料模型（4 張表 + 1 個欄位 + 3 個 schema enum）

### 5.1 Enum

```prisma
enum PunchType {
  CLOCK_IN
  CLOCK_OUT
}

// Info: (20260813 - Julian) Demo 只有 GPS，但保留 enum：
// Info: (20260813 - Julian) 之後加 NETWORK / CORRECTION 不需要 migration 改欄位型別。
enum PunchVerification {
  GPS
  NETWORK
  CORRECTION
}

// Info: (20260813 - Julian) 排班日的性質。判定引擎依此決定當天是否需要出勤
enum WorkDayType {
  WORK        // 上班日
  REGULAR_OFF // 例假
  REST_DAY    // 休息日
  HOLIDAY     // 國定假日
  LEAVE       // 請假（銜接未來的假勤模組，demo 不使用）
  // ToDo: (20260813 - Julian) 工程場景需要 SUSPENDED（停工）——見下方說明。demo 暫借 HOLIDAY。
}
```

> ### ⚠️ 工程場景的 schema 缺口：`WorkDayType` 沒有「停工」
>
> 因雨、颱風、災害而由機關公告停工，上面五個值**沒有一個對**：它不是例假、不是休息日、不是國定假日，也不是個人請假 —— 它是**機關單方面免除當日出勤義務**，而且在工程業是常態不是例外。
>
> Demo 暫借 `HOLIDAY`（兩者對判定引擎的效果相同：不需出勤、有打卡也不算異常），但**正式版會讓「今年停工幾天」與「今年國定假日幾天」混在同一個值裡** —— 而前者是工期展延與契約計價的依據，工程機關一定會問。
>
> **正式版建議新增 `WorkDayType.SUSPENDED` 與 `EmployeeShiftDay.suspensionReason String?`**（因雨／因颱風／因災害／機關指示）。列入 §12.3 補完清單。
>
> 這是本次改為工程機關版時才浮現的缺口 —— 辦公室情境永遠不會遇到它。

**登記到 `src/__tests__/hr_enum_mirror.test.ts`：**

| Enum | 去哪份清單 | 理由 |
|---|---|---|
| `PunchType`、`PunchVerification`、`WorkDayType` | **`MIRRORED`** | schema 有對應 |
| `ShiftPatternKind`（`FIXED` / `FLEXIBLE`） | **`UI_ONLY`** | §D1 的**衍生值**，schema 刻意沒有這個欄位 |
| `AttendanceDayStatus`、`AttendanceExceptionType` | **`UI_ONLY`** | demo 不落地判定結果（§4.3），這兩個只存在於 TypeScript |
| `PresenceStatus`（`ON_SITE` / `STALE`） | **`UI_ONLY`** | 計算值 |

> **最後兩列在正式版會搬家**：判定結果落地成 `AttendanceDailyResult` / `AttendanceException` 之後，`AttendanceDayStatus` 與 `AttendanceExceptionType` 成為 schema enum，必須從 `UI_ONLY` 移到 `MIRRORED`。**忘了搬，那支測試會把它們報成「漏了鏡像」** —— 這是可預期的、而且屆時訊息會直接指出來，不需要現在額外標註。

### 5.2 `ShiftPattern` —— 一張表，兩種工時制度（P4 的實作）

```prisma
/**
 * Info: (20260813 - Julian) 班別定義。**沒有 shiftType 欄位。**
 *
 * ## 為什麼沒有判別欄位
 * 固定班表就是「彈性窗收縮到與核心時間重合」的彈性班表：
 *   朝九晚六 = 窗 09:00–18:00、核心 09:00–18:00
 *   核心 10–16 = 窗 07:00–22:00、核心 10:00–16:00
 * 型別由值決定（windowStart == coreStart && windowEnd == coreEnd ⇒ 固定班），
 * 存一個可以與這些值矛盾的欄位，它唯一能做的事就是說謊（母計畫 §D1、ADR 019 同判準）。
 * UI 需要標籤時由 service 算成衍生 DTO 欄位 ShiftPatternKind，**不可寫回資料庫**——
 * 慣例同 src/constants/hr_management.ts 既有的 ProcessTaskType。
 *
 * ## 為什麼時刻用 Int 而不是 DateTime
 * 「09:00」是時刻概念不是時間點。用 DateTime 會被迫綁一個沒有意義的日期，
 * 而那個日期會在時區轉換時產生真實偏移。Int 分鐘（0–2879，≥1440 表次日）沒有這個問題，
 * 且跨日班（22:00→次日 06:00 = 1320→1800）的表達是自然的。
 */
model ShiftPattern {
  id   String @id @default(uuid())
  code String
  name String // Info: (20260813 - Julian) 例：朝九晚六、彈性班、早班、晚班

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260813 - Julian) 六個欄位全部 NOT NULL——沒有「只對某一種制度有意義」的欄位
  windowStartMinute   Int @map("window_start_minute")   // 最早可認列的上班時刻
  windowEndMinute     Int @map("window_end_minute")     // 最晚可認列的下班時刻
  coreStartMinute     Int @map("core_start_minute")     // 遲到判定基準
  coreEndMinute       Int @map("core_end_minute")       // 早退判定基準
  requiredWorkMinutes Int @map("required_work_minutes") // 應工作分鐘（不含休息）
  breakMinutes        Int @map("break_minutes")

  shiftDays EmployeeShiftDay[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([accountBookId, code])
  @@index([accountBookId])
  @@map("shift_pattern")
}
```

**Demo 要 seed 的四種班別**（涵蓋兩種制度 + 輪班 + 跨日）：

| code | name | 窗起 | 窗迄 | 核心起 | 核心迄 | 應工作 | 休息 | 衍生 kind |
|---|---|---|---|---|---|---|---|---|
| `FIX-98` | 朝九晚六 | 09:00 | 18:00 | 09:00 | 18:00 | 480 | 60 | `FIXED` |
| `FLEX-CORE` | 彈性班（核心 10–16） | 07:00 | 22:00 | 10:00 | 16:00 | 480 | 60 | `FLEXIBLE` |
| `SHIFT-EARLY` | 早班 | 06:00 | 14:00 | 06:00 | 14:00 | 420 | 60 | `FIXED` |
| `SHIFT-LATE` | 晚班 | 14:00 | 22:00 | 14:00 | 22:00 | 420 | 60 | `FIXED` |

> `SHIFT-EARLY` 的窗迄 14:00 就是 §3.2 用來演示 `STALE` 的那一班 —— **排班要配合演示時段**。

### 5.3 `EmployeeShiftDay` —— 逐日排班

```prisma
/**
 * Info: (20260813 - Julian) 逐日排班／劃休。
 *
 * dayType 與 shiftPatternId 必須一致（WORK 必有班別、非 WORK 必無），
 * 由 attendance_schedule_invariant 的 assertSchedulableDay 擋在 repository。
 *
 * 為什麼不拆成 ScheduledWorkDay / ScheduledOffDay 兩張表（ADR 019 的做法）：
 * 拆表會弄丟下面這條唯一約束，變成「同一人同一天既排班又排休」——
 * 用一個非法狀態換掉另一個，而且換來的更糟。判準不是「有沒有 discriminator 欄位」，
 * 是「拆完之後非法狀態的總量有沒有變少」。見母計畫 §D2。
 */
model EmployeeShiftDay {
  id String @id @default(uuid())

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])
  employeeId    String      @map("employee_id")
  employee      Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  // Info: (20260813 - Julian) "YYYY-MM-DD"，與 AttendancePunch.workDate 同型別同語意
  workDate String      @map("work_date")
  dayType  WorkDayType @map("day_type")

  // Info: (20260813 - Julian) dayType = WORK 時必填，其餘必為 null（不變式）
  shiftPatternId String?       @map("shift_pattern_id")
  shiftPattern   ShiftPattern? @relation(fields: [shiftPatternId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Info: (20260813 - Julian) 本模組最重要的一條約束：一人一天只有一筆排班
  @@unique([accountBookId, employeeId, workDate])
  @@index([accountBookId, workDate])
  @@map("employee_shift_day")
}
```

### 5.4 `WorkLocation` 與 `AttendancePunch`

與 v1.1 相同，此處不重複。要點：

- `WorkLocation`：`latitude` / `longitude`（`Float`，同既有 `Seaport` / `Airport`）、`radiusMeters`（`Int`）、`@@unique([accountBookId, code])`
- `AttendancePunch`：`id` 由應用層 `randomUUID()`（AAD 前置）、`workLocationId` **必填**（圍欄外進不來）、`latitudeCipher` / `longitudeCipher` 密文、`distanceMeters` 明文、`piiKeyVersion Int` NOT NULL、**repository 無 `update` / `delete`**

### 5.5 `Employee` 新增欄位

`userId String? @unique` + `user User?`（§2.1），`User` 加反向關聯 `employee Employee?`。

### 5.6 需連帶修改

| 檔案 | 修改 |
|---|---|
| `prisma/schema.prisma` | +4 model、+3 enum、`Employee.userId` 與 `shiftDays`、`User.employee`、`AccountBook` 四個反向關聯、`model Checkin` 澄清註解（母文件 §2.1） |
| `src/constants/hr_pii.ts` | `HrPiiTable` 加 `ATTENDANCE_PUNCH`；`HR_PII_FIELD_TIER` 加 `latitudeCipher` / `longitudeCipher` → `CONFIDENTIAL` |
| `src/constants/attendance.ts` | enum 鏡像 + `DEMO_GEOFENCE_RADIUS_METERS = 500` + `DEMO_PRESENCE_STALE_MINUTES = 3` + `DEMO_LATE_GRACE_MINUTES` + `DEMO_TIME_ZONE = "Asia/Taipei"` + `ATTENDANCE_ROUTE` |
| `src/constants/hr_management.ts` | `HR_MANAGEMENT_ROUTE` 加四個 attendance 路由 |
| `src/lib/utils/error_dictionary.ts` | +9（流水號見 §7.2） |
| `src/__tests__/hr_enum_mirror.test.ts` | `MIRRORED` +3、`UI_ONLY` +4（見 §5.1） |
| `src/components/hr_management/hr_nav_items.ts` | 加入導覽項，沿用既有 `disabled` 旗標 |
| `.env.example` | `DEMO_ALLOW_MANUAL_COORDINATE` + 警語 |

---

## ⚖️ 6. 判定引擎（本次新增的核心）

### 6.1 P4 的實作：四條規則、零分支

`src/lib/attendance_rules.ts` 匯出一支純函數。**無 DB、無 I/O、不呼叫 `Date.now()`**（「現在」由呼叫端注入）：

```typescript
export function evaluateAttendanceDay(
  input: IAttendanceDayInput,
): IAttendanceEvaluation;
```

核心判定 —— **沒有任何 `switch (shiftType)`**：

| 判定 | 統一規則 | 朝九晚六（固定） | 核心 10–16（彈性） |
|---|---|---|---|
| 遲到 | `firstIn > coreStart + grace` | 09:47 → **遲到 47 分** | 09:47 → **正常**（早於核心 10:00） |
| 早退 | `lastOut < coreEnd − grace` | 17:30 → 早退 30 分 | 17:30 → 正常 |
| 工時不足 | `工作分鐘 < requiredWorkMinutes` | 恆滿足即無異常 | 10:00–16:00 只有 360 < 480 → **不足 120 分** |
| 窗外時間 | 打卡先 clamp 進 `[windowStart, windowEnd]` | 08:00 到班不多算工時 | 06:00 到班不多算工時 |

**工作分鐘**：`clamp(lastOut, 窗內) − clamp(firstIn, 窗內) − breakMinutes`，為負取 0。

> **這張表就是 P4 的演示腳本。** 同樣的 09:47，兩種制度得到不同結論，而中間沒有一行程式碼在區分它們 —— 差別完全來自 `ShiftPattern` 那六個欄位的值。

### 6.2 判定表（demo 涵蓋 12 條中的 11 條）

由上而下，第一個命中即決定當日狀態：

| # | 條件 | 狀態 | 異常 | Demo 演？ |
|---|---|---|---|---|
| 1 | `dayType ≠ WORK` 且無打卡 | `OFF_DAY` | — | ✅ 月曆灰格 |
| 2 | `dayType ≠ WORK` 且有打卡 | `OFF_DAY` | — | ✅ **假日出勤不是異常**，是加班事實 |
| 3 | 無排班 | `NO_SCHEDULE` | — | ✅ **不判曠職**（§6.3） |
| 4 | 應出勤、完全無打卡、且已過窗迄 | `EXCEPTION` | `ABSENT` | ✅ seed 歷史資料 |
| 5 | 應出勤、完全無打卡、但當日未結束 | `NORMAL`（暫定） | — | ✅ 指出今天的空格為何不是紅的 |
| 6 | 有 `CLOCK_OUT` 無 `CLOCK_IN` | `EXCEPTION` | `MISSING_CLOCK_IN` | ✅ seed |
| 7 | 有 `CLOCK_IN` 無 `CLOCK_OUT`、且已過窗迄+寬限 | `EXCEPTION` | `MISSING_CLOCK_OUT` | ✅ **與 `STALE` 對照演示** |
| 8 | `firstIn > coreStart + 寬限` | `EXCEPTION` | `LATE` | ✅ **P4 主秀** |
| 9 | `lastOut < coreEnd − 寬限` | `EXCEPTION` | `EARLY_LEAVE` | ✅ |
| 10 | 工作分鐘 < 應工作分鐘 | `EXCEPTION` | `INSUFFICIENT_HOURS` | ✅ 彈性班專屬情境 |
| 11 | G5 瞬移偵測 | `EXCEPTION` | `SUSPICIOUS_JUMP` | ❌ **demo 未實作 G5** |
| 12 | 以上皆不成立 | `NORMAL` | — | ✅ |

**8–10 可同時成立**，因此引擎回傳的是**異常清單**而不是單一狀態 —— 一天可以同時遲到又早退，母文件 §4.2 也因此把異常設計成子表而非 enum 欄位。

### 6.3 三條「不判為異常」的刻意設計（演示時值得講）

| 情境 | 為什麼不判 |
|---|---|
| **無排班**（#3） | 判曠職等於系統自己發明了一個不存在的應出勤義務。**沒有班表就沒有比較基準** —— 這是「零捏造」在本模組的具體形狀 |
| **當日未結束**（#5、#7） | 判定的前提是「這一天已經過完」。提早下結論會讓早班同仁每天早上都收到曠職通知 |
| **假日出勤**（#2） | 假日來上班是加班事實不是異常。標紅會讓真正的異常被淹沒 |

> 這三條在演示時**比任何一個異常更值得講**：它們證明系統知道自己不知道什麼。一套會把「沒排班」判成曠職的系統，產出的每一個數字都不能信。

### 6.4 工時只輸出分鐘，不換算金額

本模組**只輸出分鐘數**。加班費、時薪、假日加給屬薪資模組職責，該處走 `MoneyUtil` / `Prisma.Decimal`（ADR 020 §2.2、§4）。**分鐘 → 金額的乘法絕不在本模組發生。**

演示時若被問到「那加班費呢」，正確答案是：「出勤系統負責把時間算對，錢由薪資模組算 —— 兩邊各算一次，遲早會對不起來。」

---

## 🔌 7. Demo 端點（10 支）

前綴 `/api/v1/user/account_book/[account_book_id]/hr/attendance/`，一律 `getIdentityFromDeWT` → `safeParse` → service → `jsonOk` / `jsonFail`。

| # | Method | 路徑 | 說明 |
|---|---|---|---|
| A1 | `POST` | `/punch` | 打卡。body：`{ punchType, latitude, longitude, accuracy }`。**無時間欄位**（G1）。圍欄外 → 403 |
| A2 | `GET` | `/today` | 我今天的狀態：班別、是否在班、上班時間、所在地點 |
| A3 | `GET` | `/presence` | 各地點的 `ON_SITE` / `STALE` 人數 |
| A4 | `GET` | `/presence/location/[location_id]` | 該地點到班名單 |
| A5 | `GET` | `/location` | 地點與圍欄清單（前端畫地圖圓圈） |
| **A6** | `GET` | `/shift_pattern` | 班別清單（含衍生的 `kind`） |
| **A7** | `GET` | `/schedule` | 排班月曆（部門 × 月），回傳每日 `dayType` 與班別 |
| **A8** | `PUT` | `/schedule` | 改單日排班（演示輪班調整；body：`employeeId` / `workDate` / `dayType` / `shiftPatternId`） |
| **A9** | `GET` | `/result` | **出勤判定結果**（期間 × 員工）。**即時計算，不讀表**（§4.3） |
| **A10** | `POST` | `/presence/roster/export` | **現場名單匯出 CSV**（工安點名）。含地點、名單、**產出時間戳與產出者** |

地點與班別的建立走 seed，不做 CRUD 端點。

> **A10 是 v2.1 為工程機關加回來的。** 母文件 §D10.4 把緊急點名匯出定位為現場名單功能的正當性核心 —— 職安場景下「現場有幾個人、分別是誰」必須在事故當下答得出來，而**匯出檔案要含產出時間戳與產出者**（事故調查時，「這份名單是幾點產出的」與名單本身同等重要）。
> 成本只是一支 CSV，但它是對這個聽眾說服力最高的一個按鈕。
> **Demo 版不做權限控制**（正式版需 `EMERGENCY_ROSTER` 權限 + `AuditLog`），這一條列在 §12.3 第 1 順位。

### 7.1 A9 的內部流程（即時判定）

```
1. 取期間內的 EmployeeShiftDay（含 shiftPattern）
2. 取期間內的 AttendancePunch，依 (employeeId, workDate) 分組
3. 對每一個 (員工 × 日期) 呼叫 evaluateAttendanceDay(...)
      evaluatedAt = 伺服器現在時間（由呼叫端注入，引擎內不取）
4. 組成月曆矩陣回傳
```

一個月 × 5 人 = 150 次純函數呼叫，兩次查詢。**Demo 規模下即時算完，不需要落地也不需要 Worker。**

### 7.2 新增錯誤碼（流水號接續現況最大值 `VA000041` / `FO000008` / `NF000016` / `CF000003`）

| Key | code | ApiCode | 情境 |
|---|---|---|---|
| `FO_PUNCH_OUT_OF_FENCE` | `FO000009` | `FORBIDDEN` | **P2 主角**，回應含最近地點與 `distanceMeters` |
| `VA_PUNCH_LOW_ACCURACY` | `VA000042` | `VALIDATION_ERROR` | 訊息須為「定位精度不足，請重試」而非「你不在現場」 |
| `VA_PUNCH_INVALID_STATE` | `VA000043` | `VALIDATION_ERROR` | 重複上班卡 / 未上班先下班 |
| `VA_PUNCH_NO_SCHEDULE` | `VA000044` | `VALIDATION_ERROR` | 當日無排班（demo 設為**允許**打卡，此碼保留備用） |
| `VA_SCHEDULE_DAY_INVALID` | `VA000045` | `VALIDATION_ERROR` | `WORK` 未帶班別 / 非 `WORK` 卻帶班別（不變式轉譯） |
| `NF_EMPLOYEE_FOR_USER` | `NF000017` | `NOT_FOUND` | Google 帳號對不到員工檔（§2.1） |
| `NF_WORK_LOCATION` | `NF000018` | `NOT_FOUND` | — |
| `NF_SHIFT_PATTERN` | `NF000019` | `NOT_FOUND` | — |
| `CF_EMPLOYEE_ALREADY_LINKED` | `CF000004` | `CONFLICT` | 該員工檔已綁給別的帳號 |

> `ApiCode.CONFLICT` 在本專案的前綴是 **`CF_`**（見 `CF_SETTING_VERSION_CONFLICT`），不是 `CO_`。

---

## 🖥️ 8. 前端（4 頁）

### 8.1 `/hr_management/attendance` —— 打卡頁

```
┌──────────────────────────────────────┐
│  早安，Julian（EMP001）                │
│  今日班別：朝九晚六　09:00–18:00        │
│                                      │
│  📍 距離 台北總部 32 公尺  ✅ 可打卡     │
│                                      │
│        ┌────────────────┐            │
│        │   上班打卡      │            │
│        └────────────────┘            │
│                                      │
│  今日：尚未打卡                        │
└──────────────────────────────────────┘
```

- **顯示今日班別**（v1.1 沒有）—— 打卡前就知道自己幾點該到，遲到與否不是事後才知道
- 四種定位狀態各有文案：`定位中` / `可打卡（顯示距離）` / `距離過遠（顯示最近地點與距離）` / `定位被拒絕或失敗`
- **按鈕在圍欄外時保持可按**（不 disable）—— disable 的按鈕不會告訴任何人為什麼
- 打卡成功後切換為「已上班 09:47 @ 台北總部　⚠️ 遲到 47 分」→ 這一行讓 P4/P5 在第一段就先埋伏筆
- 示範模式開啟時，頂端紅色橫幅 + 經緯度輸入框

### 8.2 `/hr_management/attendance/presence` —— 現場人數與名單

```
┌─ 台北總部 ───────────────────────┐
│  🟢 在班 3      🟡 未打下班卡 1     │
│                                  │
│  [地圖：標記 + 500m 圓圈]          │
│                                  │
│  王小明  EMP002  工程部  09:05  🟢  │
│  Julian  EMP001  產品部  09:47  🟢  │
│  陳大文  EMP003  門市部  06:02  🟡  │← 早班，窗迄 14:00 已過
└──────────────────────────────────┘
```

- 地圖用既有 `maplibre-gl@^6.1.0`，可參考 `src/components/map_viewer.tsx`
- **前端拿不到任何員工座標** —— 地圖上只有 `WorkLocation` 中心點與圍欄圓圈（母文件 §D5 的邊界在 demo 就要守住）
- **「未到工」現在算得出來了**（v2.1 由「應到未打卡」改名）：有了班表，`dayType = WORK` 且已過窗起卻無打卡的人數。v1.1 只能顯示 `—`
- **這個數字對工程機關是主角** —— 排了班卻沒有打卡紀錄，就是出工差異。**不必比對任何報表，系統自己算出來**
- 15 秒輪詢

### 8.3 `/hr_management/attendance/schedule` —— 排班月曆（新增）

```
        1   2   3   4   5   6   7   8 …
王小明  九  九  九  九  九  休  例  九
陳大文  早  早  晚  晚  休  例  早  早    ← 輪班
林美玲  彈  彈  彈  彈  彈  休  例  彈
```

- 部門 × 月的方格圖，班別以顏色與簡稱區分（朝九晚六 / 早 / 晚 / 彈性 / 休 / 例 / 國定）
- **點單格 → 下拉選單改班別或改成休假**（A8）。**不做拖拉** —— 拖拉是排班工具的功能，不是這場 demo 的主張
- 唯讀模式給一般員工看自己的班表；HR 可編輯

> 演示「排班制」的方式是**指著陳大文那一列的早/晚交替**，不是操作介面。輪班的樣子本身就是說明。

### 8.4 `/hr_management/attendance/result` —— 出勤總覽與異常（新增）

```
2026 年 8 月                      [全部▾] [異常▾]

        1   2   3   4   5   6   7   8 …   遲到  早退  曠職  漏打卡
王小明  ✅  ✅  🔴  ✅  ✅  ─   ─   ✅      1     0     0     0
陳大文  ✅  ⚫  ✅  ✅  ─   ─   ✅  🟠      0     0     1     1
林美玲  ✅  ✅  ✅  🟡  ✅  ─   ─   ✅      0     0     0     0
                                             ↑ 工時不足 120 分
```

- 一格 = 一天的判定結果，點開顯示明細（班別、打卡時間、工作分鐘、異常清單與分鐘數）
- 顏色：✅ 正常 / 🔴 遲到 / 🟠 曠職 / 🟡 工時不足 / ⚫ 漏打卡 / ─ 休假
- **今天那一格若無打卡顯示為空白而非紅色** —— 對應判定表 #5，演示時要指出來（§6.3）
- 篩選：僅顯示異常、依員工、依異常型別

---

## 🌱 9. Seed 資料

**完整規格見 `documents/architecture/attendance_demo_mock_data.md`（工程機關版）。** 以下只列要點與相對 v2.0 的修正。

| 產出 | 內容 |
|---|---|
| `AccountBook` | 1 本「示範工程處」，id `demo-book-public-works` |
| `Department` | **5 個**：工程處本部 + 品管與職安室 + 三個工務所（各對應一個工地） |
| `JobTitle` | **9 個**：工程處長、工地主任、工地工程師、監造工程師、品管工程師、職安衛管理員、測量工程師、材料試驗員、工務行政 |
| `Employee` | **12 人**（v2.0 是 5 人，見下）。**只有兩位需要真實 Google 帳號**：EMP005 工地主任、EMP006 工地工程師 |
| `WorkLocation` | **4 處**：本部（300 m）+ 三個工區（500 / 800 / 800 m）。**只有演示現場那一個需要實測座標** |
| `ShiftPattern` | **4 種**：工地日班、夜間施工班（跨日）、工程師彈性班、本部行政班 |
| `EmployeeShiftDay` | 8/1–8/21，含**因雨停工日**與**颱風後搶修** |
| `AttendancePunch` | 8/3–8/12 歷史，刻意佈置成涵蓋判定表 11 條 |

### 9.1 兩處相對 v2.0 的修正

**修正一：人數由 5 人增為 12 人。**
現場人數看板顯示「在班 2 人」沒有說服力，而**「未到工」的分母不能是 3**。12 人分布在 4 個地點，看板才有「機關管轄多個工地」的樣子。Seed 成本不隨人數線性增加 —— 排班與打卡都是程式產生的。

**修正二：今日打卡不是全部留空，只留空上台的兩位。**
v2.0 說「今天的資料留空，由現場真人打卡產生」。但若全體留空，**現場頁在演示開始時是空的** —— 而「工地上有幾個人」這個主張需要一個有內容的畫面當背景。
正確做法：**EMP005 / EMP006 留空（現場打），其餘十位由 seed 產生今日打卡。** 演示的說服力來自「歷史是 seed 的，但剛剛那兩筆是真的」，不是「全部都是現場打的」。

### 9.2 三個必須配合演示的安排

1. **演示現場的工地座標必須實測** —— 由 env（`DEMO_SITE_A_LAT` / `_LNG`）帶入，**沒設定就讓 seed 中止**。預設值會被沿用，而沿用的後果是演示當天打不了卡。
2. **EMP010 的前一夜夜班打卡（20:05 進、無下班卡）是 `STALE` 演示的來源** —— 夜班窗迄為今晨 05:00，演示時（14:00）早已過寬限，自然轉黃。**這一筆同時也是 8/12 的 `MISSING_CLOCK_OUT`**，一筆資料同時服務兩個畫面（§11 步驟 12）。
3. **P4 的對照組必須排在同一天** —— EMP002（本部行政班，核心 09:00）與 EMP011（彈性班，核心 10:00）在 8/12 同樣 09:47 打卡，一個遲到 47 分、一個正常。分在不同天就得翻頁，效果掉一半。

### 9.3 歷史資料必須涵蓋的十一種情形

遲到、早退、**曠職**、漏打上班卡、漏打下班卡、**彈性班工時不足**、**彈性班晚到但正常**、假日出勤（不算異常）、跨日夜班、因雨停工、一天多重異常。

> **沒有這些，出勤總覽會是一片綠色 —— 而一片綠色什麼也證明不了。**
> 逐筆的日期、員工、打卡時間與預期判定結果，見展示資料文件 §8。

## 🗓️ 10. 工作分解（估 11.25 個工作天 / 1 人）

| # | 工作 | 產出 | 估時 |
|---|---|---|---|
| W1 | 資料層：schema（4 表 3 enum + `Employee.userId`）、migration、`hr_pii.ts` 登記、enum mirror（`MIRRORED` +3 / `UI_ONLY` +4） | migration 可跑、`npm run test` 綠 | 1.0 d |
| W2 | 身分橋接：`attendance_identity.service.ts` + 3 個錯誤碼 | Google 登入後取得 `Employee` | 0.5 d |
| W3 | 打卡：`attendance_punch.service.ts`（圍欄判定 + 加密 + append-only repo）+ A1 / A2 / A5 | 圍欄外回 403 帶距離 | 1.0 d |
| **W4** | **規則引擎 `attendance_rules.ts` + 表格驅動測試（判定表 11 條 + 邊界）** | **T1 / T2 綠燈** | **1.5 d** |
| W5 | 班表：`attendance_schedule.service.ts` + `assertSchedulableDay` + A6 / A7 / A8 | 排班可讀可改 | 0.75 d |
| W6 | 判定 API：即時評估組月曆矩陣 + A9 | 出勤結果正確 | 0.5 d |
| W7 | 現場狀態：由 punch 推導 + `STALE`（正式語意）+ 應到未打卡 + A3 / A4 | 名單正確、窗迄後轉黃 | 0.5 d |
| W8 | 前端打卡頁（四種定位狀態 + 今日班別 + 示範橫幅） | P1 / P2 可演 | 1.0 d |
| W9 | 前端現場頁 + maplibre 地圖 + 圍欄圓圈 | P3 可演 | 1.0 d |
| W10 | 前端排班月曆（唯讀 + 單格下拉編輯） | P4 上半可演 | 1.0 d |
| W11 | 前端出勤總覽（方格圖 + 明細彈窗 + 篩選） | P4 下半 / P5 可演 | 1.0 d |
| W12 | Seed（12 人 / 4 地點 / §9.3 十一種情形）+ 現場名單 CSV 匯出（A10）+ **座標校準頁**（執行手冊 §3.4）+ 環境設定 + **實地校準** + 完整彩排 | §10.1 全綠 | 1.5 d |

**關鍵路徑**：W1 → W2 → W3 → W8（第一段），W1 → W4 → W6 → W11（第二段）。W4 可與 W2/W3 併行 —— 它是純函數，不依賴任何其他部分。

> **W4 是唯一不該壓縮的項目。** `attendance_rules.ts` 是本次 demo **唯一一段寫完就是正式版的程式碼**（母文件 §D7 要求它是純函數，而純函數沒有「demo 版」）。它的測試也是唯一必須窮舉的 —— 決定論的驗收方式是表格，不是抽樣。

### 10.1 Demo 前檢查清單

> **完整的時程、校準程序與現場故障對照表見 `attendance_demo_runbook.md`。** 本節只保留工程側要交付的項目。


- [ ] Google Cloud Console OAuth 用戶端已建立，redirect URI = `${NEXT_PUBLIC_APP_URL}/auth/callback/google`
- [ ] `GOOGLE_OAUTH_CLIENT_ID` / `_CLIENT_SECRET` 已灌入系統設定 → **登入畫面看得到 Google 按鈕**（看不到就是沒設定好）
- [ ] `HR_PII_KEY_V1` 與 `HR_PII_BLIND_INDEX_PEPPER` 已設定（缺金鑰 → `encryptPii` 拋 `HrPiiKeyError`，打卡全掛，症狀最不直觀）
- [ ] **每位上台者的 Google 帳號 = 其 `Employee.email`**，且該筆 `userId` 為 null
- [ ] `WorkLocation` 座標為**現場實測值**，半徑 500 公尺
- [ ] **今天的排班已 seed**，且上台者的班別是預期的那一個（工地日班 07:30–17:00）
- [ ] **EMP010 的前一夜夜班打卡存在且無下班卡**（§9.2 第 2 項），`STALE` 才演得出來
- [ ] 出勤總覽頁的歷史資料涵蓋 §9.3 全部十一種情形（**上台前自己先看一遍那張方格圖**，預期畫面見展示資料 §9.4）
- [ ] **今日打卡已 seed，且不含上台的兩位**（§9.1 修正二）—— 否則現場頁一開始是空的
- [ ] 現場頁四個工地都有人，且演示工地顯示「未到工 1」
- [ ] `NEXT_PUBLIC_APP_URL` 為 HTTPS（`navigator.geolocation` 在非 HTTPS 不運作，localhost 除外）
- [ ] 演示裝置已授權瀏覽器定位
- [ ] `DEMO_ALLOW_MANUAL_COORDINATE=true`，紅色橫幅正常顯示
- [ ] **要投影的那段程式碼已備妥**（P4 要證明「沒有 `if (shiftType)`」，見 §11 步驟 9）
- [ ] 至少 2 人實際走過完整流程
- [ ] 會場網路可連 `accounts.google.com` 與 `www.googleapis.com`（JWKS 驗簽）

---

## 🎥 11. 演示腳本（約 9 分鐘，兩段）

### 第一段：「工地上現在有誰」

| 步 | 動作 | 主張 | 台詞重點 |
|---|---|---|---|
| 1 | 點「使用 Google 登入」 | **P1** | 「員工用公司既有的 Google 帳號，不必記第二組密碼」 |
| 2 | 打卡頁顯示「今日班別 工地日班 07:30–17:00」+「距大安溪橋梁工區 32 公尺 ✅」 | P1 | 「在你按下去之前，系統就先告訴你打不打得成、以及你今天幾點該到」 |
| 3 | 按「上班打卡」→ 成功 | — | — |
| 4 | 切現場頁 → **四個工地的地圖標記**，本工區「在班 3 / 未到工 1 / 未打下班卡 0」，名單有自己 | **P3** | **「未到工那一個，是排了班但今天沒有打卡紀錄的人 —— 出工差異不必比對報表，系統自己算出來」** |
| 5 | **切示範模式，輸入 3 公里外座標 → 403「距大安溪橋梁工區 3.2 公里」** | **P2** | **「人不在現場，不是『到班但有疑慮』，是到班沒有發生。系統不記錄一件沒發生的事」** |
| 6 | 回現場頁，指出名單沒變 | P2→P3 | 「這就是第 4 步那個數字為什麼可信 —— 圍欄外的打卡從來沒進過資料庫」 |
| 7 | 請第二人打卡 → 名單即時多一人 | P3 | 「工安事故時，這張名單是要拿來對人頭的」 |
| 7b | **點「匯出現場名單」→ CSV，指出檔案含產出時間與產出者** | P3 | **「事故調查時，『這份名單是幾點幾分產出的』與名單本身同等重要」** |
| 7c | 指著台中港區工區的 🟡 許家豪（昨夜夜班未打下班卡） | P3 | **「系統沒說他在、也沒說他不在，說的是『我不知道』—— 這一格是最優先要打電話確認的」** |

> **第 5、6 步要連著講。** P2 單獨演示只是一個錯誤訊息；接上第 6 步之後，它才變成 P3 的地基。

### 第二段：「出勤對不對得上」

| 步 | 動作 | 主張 | 台詞重點 |
|---|---|---|---|
| 8 | 打開排班月曆，指許家豪的夜間施工班、以及 8/7 那一整欄的**因雨停工** | P4 | 「夜間封路施工、因雨停工，排班表上都是一格。點一格就能調」 |
| 9 | **打開出勤總覽 8/12 那一欄：林淑芬 09:47 遲到 47 分、周欣怡同樣 09:47 正常** | **P4** | **「同一天、同一分鐘、相反結論。因為一個是本部行政班、一個是工程師彈性班」** |
| 10 | **投出 `attendance_rules.ts`，指出沒有 `if (shiftType)`** | **P4** | **「資料庫裡沒有『班別類型』這個欄位。固定班就是彈性窗收縮到跟核心時間一樣的彈性班 —— 所以判定引擎一條分支都不需要。要加第三種制度，改的是資料不是程式碼」** |
| 11 | 點開周欣怡 8/6：09:30 進 17:00 出 → **不遲到、不早退，但工時不足 90 分** | P5 | 「彈性工時真正要管的不是幾點到，是總時數夠不夠」 |
| 12 | **指出王雅琪 8/11 的曠職**（排了班完全沒到工） | **P5** | **「這一天工務所回報 4 人出工，系統只有 3 筆打卡。這就是出工查核」** |
| 12b | 指出許家豪 8/12 的漏打下班卡；**切回現場頁，他此刻正是 🟡** | P5 | **「同一件事的兩個面向：現在這張名單告訴職安『我不確定他還在不在』，隔天這張報表告訴管理單位『這天要補登』」** |
| 13 | 指著今天那一格的空白 | P5 | **「他今天還沒打卡，但系統沒有判他曠職 —— 現在才下午三點。一套會在早上十點判人曠職的系統，產出的每個數字都不能信」** |
| 14 | 指著 8/7 那一整欄的停工格 | P5 | 「因雨停工，當天沒有出勤義務，不算任何人異常」 |
| 14b | 指著 8/8 週六張文彬與李冠廷的搶修出勤 → **⬜ 無異常** | P5 | **「假日到工是加班事實不是異常。把它標紅，真正的異常就會被淹沒」** |
| 15 | 收尾 | — | 「打卡有異常時，員工線上填補登單、主管確認後系統自動重算 —— 這部分在正式版」 |

> **第 10 步是整場 demo 對技術聽眾價值最高的一分鐘**，也是唯一需要投影程式碼的地方。
> **第 4、7c、12、12b 步是對工程機關價值最高的四分鐘** —— 出工差異、事故點名、以及「系統知道自己不知道什麼」。
> **第 13 步不要跳過**：一套會在下午三點就判人曠職的系統，產出的每個數字都不能信 —— 這句話決定了聽眾要不要相信前面所有的數字。

---

## ⚠️ 12. 風險與 Demo 後清理

### 12.1 演示風險

| 風險 | 機率 | 影響 | 緩解 |
|---|---|---|---|
| **會場定位漂移超過 500 公尺** | 低 | P1/P2 全毀 | 500 公尺已極寬鬆；彩排實測；備案是現場改 seed 座標 |
| **瀏覽器定位權限被拒** | 中 | 打不了卡 | 前一天演練；文案給明確的重新授權指引 |
| **會場網路擋 Google** | 中 | P1 全毀 | 檢查清單最後一項；備案手機熱點 |
| **上台者 Google 帳號對不上 `Employee.email`** | 中 | 登入後卡在 404 | 檢查清單第 4 項；seed 前逐一確認 |
| **`HR_PII_KEY_V1` 未設定** | 低 | 打卡全數 500 | 檢查清單第 3 項。**症狀最不直觀的一項** |
| **seed 歷史資料沒涵蓋到某種異常** | **中** | **P5 講到一半發現沒有例子** | **上台前自己把方格圖看一遍**（§10.1） |
| **演示時段與排班對不上，`STALE` 沒出現** | 中 | 步驟 12 演不了 | §9.2 第 2 項；彩排時確認 |
| 示範模式橫幅沒顯示，觀眾以為系統真能被任意定位 | 低 | 信任受損 | 橫幅紅色置頂；彩排確認 |

### 12.2 Demo 後必須清理

依 `annotation.md`，以下以 `Deprecated:` 標記，**Release 前的清查會抓到**：

| # | 項目 | 為什麼必須移除而不是保留 |
|---|---|---|
| 1 | `DEMO_ALLOW_MANUAL_COORDINATE` 與手動座標路徑（§3.3）**與座標校準頁**（執行手冊 §3.4） | **它讓客戶端指定自己的位置，與護欄 G2 直接衝突。**改成「預設關閉」不夠 —— 一個 env 旗標就能繞過整個圍欄機制 |
| 2 | `DEMO_GEOFENCE_RADIUS_METERS = 500` | 母文件 §D6 要求實地量測。500 公尺意味著「在對面咖啡廳也算到班」，那讓圍欄即到班定義失效 |

> ✅ **v1.1 的第 3 項（`isStaleForDemo`）已消失** —— 有了班表就能用正式語意（§3.2）。**擴充範圍反而讓拋棄式程式碼少了一項。**

### 12.3 Demo 之後的補完順序（依風險排序，不是依功能大小）

| 順位 | 項目 | 為什麼是這個順序 |
|---|---|---|
| **1** | **權限矩陣 `attendance_access.guard.ts` + 隱私政策** | Demo 沒有權限控制，登入者看得到全帳本名單。**這份程式碼一旦接上真實員工資料就是全員位置揭露事故**。所以 demo 環境**不得匯入真實個資**，seed 一律虛構人物（除上台者本人 email） |
| **2** | **`WorkDayType.SUSPENDED`（停工）+ `suspensionReason`** | Demo 暫借 `HOLIDAY`。正式版混用會讓「今年停工幾天」與「今年國定假日幾天」變成同一個數字 —— **而前者是工期展延與契約計價的依據**（§5.1） |
| 3 | `ShiftAssignmentRule` 週期性指派 | 沒有它，HR 要為每個工務所人員逐日建檔：22 天 × 50 人 = 1,100 筆（§4.4） |
| 4 | 補打卡申請單 | 圍欄外一律拒絕之後，它是**外勤到班事實的唯一入口**（母文件 §D9）。工程場景尤其：跨工區支援、臨時工點都會用到 |
| 5 | **線形工程的帶狀圍欄（PostGIS）** | 道路與管線工程用圓形圍欄本來就不合用（§3.1）。**這是工程機關第一個會問的技術問題** |
| 6 | `AttendanceDailyResult` 落地 + `engineVersion` + 判定 Worker | 效能與可回溯。**在資料量還小的時候補，是最便宜的時機** |
| 7 | `AttendancePresence` 快取 + 勾稽對帳 | 同上 |
| 8 | `AuditLog` 寫入、限流、名單匯出的 `EMERGENCY_ROSTER` 權限 | 上線前必備，但不阻擋開發 |

---

## 📎 附錄：Demo 交付檔案清單

```
prisma/schema.prisma                                    （修改：+4 model、+3 enum、Employee.userId/shiftDays、User.employee、AccountBook 反向關聯、Checkin 澄清註解）
prisma/migrations/…                                     （新增）
src/constants/attendance.ts                             （新增：enum 鏡像 + demo 常數 + 路由）
src/constants/hr_pii.ts                                 （修改：HrPiiTable +1、HR_PII_FIELD_TIER +2）
src/constants/hr_management.ts                          （修改：HR_MANAGEMENT_ROUTE +4）
src/interfaces/attendance.ts                            （新增：IPunchRequest / ITodayStatus / IPresenceSummary / IRosterEntry / IAttendanceDayInput / IAttendanceEvaluation / IScheduleCell）
src/validators/attendance.ts                            （新增）
src/validators/index.ts                                 （修改：導出）
src/lib/attendance_rules.ts                             （新增：**純函數判定引擎——唯一「寫完就是正式版」的一段**）
src/lib/utils/error_dictionary.ts                       （修改：+9，流水號見 §7.2）
src/repositories/attendance_schedule_invariant.ts       （新增：assertSchedulableDay）
src/repositories/attendance_punch.repo.ts               （新增：只有 create / findMany）
src/repositories/work_location.repo.ts                  （新增）
src/repositories/shift_pattern.repo.ts                  （新增）
src/repositories/attendance_schedule.repo.ts            （新增：寫入前呼叫 assertSchedulableDay）
src/services/attendance_identity.service.ts             （新增：User ↔ Employee 橋接）
src/services/attendance_punch.service.ts                （新增：圍欄判定 + 加密 + 狀態檢查）
src/services/attendance_schedule.service.ts             （新增：班別、排班月曆、單日調班）
src/services/attendance_evaluation.service.ts           （新增：即時判定，組月曆矩陣）
src/services/attendance_presence.service.ts             （新增：由 punch 推導 + STALE + 應到未打卡）
src/app/api/v1/user/account_book/[account_book_id]/hr/attendance/**  （新增 × 10 端點，含 A10 名單匯出）
src/app/hr_management/attendance/page.tsx               （新增：打卡）
src/app/hr_management/attendance/presence/page.tsx      （新增：現場人數與名單）
src/app/hr_management/attendance/schedule/page.tsx      （新增：排班月曆）
src/app/hr_management/attendance/result/page.tsx        （新增：出勤總覽與異常）
src/components/hr_management/attendance/**              （新增）
src/i18n/locales/zh_tw/attendance.ts                    （新增；其餘語系 demo 後補）
src/components/hr_management/hr_nav_items.ts            （修改：加入導覽項，沿用既有 disabled 旗標）
src/__tests__/hr_enum_mirror.test.ts                    （修改：MIRRORED +3、UI_ONLY +4）
src/__tests__/attendance_rules.test.ts                  （新增：判定表 11 條逐條，表格驅動）
src/__tests__/attendance_rules.boundary.test.ts         （新增：邊界值）
src/__tests__/attendance_geofence.test.ts               （新增：圍欄半徑內／外／剛好）
scripts/seed/seed_attendance_demo.ts                    （新增：工程機關版，規格見 attendance_demo_mock_data.md）
documents/architecture/attendance_demo_mock_data.md      （新增：展示資料規格）
documents/architecture/attendance_demo_runbook.md       （新增：執行手冊）
src/app/hr_management/attendance/_calibrate/page.tsx    （新增：座標校準頁，demo 專用，標 Deprecated）
.env.example                                            （修改：DEMO_ALLOW_MANUAL_COORDINATE + 警語）
```

### 測試範圍為何從 1 支變成 3 支

v1.1 只寫 `attendance_geofence.test.ts`，理由是 P2 是唯一的核心主張。

加入判定引擎之後，**`attendance_rules.ts` 是整份 demo 唯一一段會原封不動進正式版的程式碼** —— 母文件 §D7 要求它是純函數、不碰 DB、不呼叫 `Date.now()`，這樣的東西沒有「demo 版」可言。而決定論的驗收方式是**窮舉表格**：

- `attendance_rules.test.ts`：判定表 11 條逐條，每條分別以固定班、彈性班、跨日班驗證
- `attendance_rules.boundary.test.ts`：剛好 `coreStart`、剛好寬限邊界、工時剛好等於 `requiredWorkMinutes`、窗外 1 分鐘
- `attendance_geofence.test.ts`：半徑內／外／**剛好等於半徑**必須明確落在准或拒

三支加起來約半天，而它們擋掉的是「demo 當天發現遲到分鐘數算錯」這種無法臨場修復的狀況。

---

> **相關文件**：`documents/architecture/time_attendance_module_plan.md`（母文件 v1.2，特別是 §D1 統一班別模型、§D2 排班不拆表、§D6 圍欄即到班定義、§D7 純函數引擎、§D10.3 `presenceStaleGraceMinutes`）、`documents/architecture/decisions/016_third_party_login_and_custodial_wallet.md`、`017_signed_system_settings_in_database.md`、`018_hr_pii_data_classification.md`、`019_hr_process_task_split.md`、`020_severance_pay_estimation.md`、`src/lib/auth/oauth/google.provider.ts`、`src/lib/hr_pii_crypto.ts`
