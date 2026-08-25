# 通知模組開發計畫書 (Notification Module Plan) v3.0

> **Author**: Julian ｜ **Last Updated**: 2026-08-25
> **對象**：`feature/notification_bell`
> **狀態**：D1–D18 已修、`npm run test` 與 `test:e2e` 綠、本機手動驗收 13/15 通過。**仍不得視為可上線** —— 見 §6。
> **決策**：[ADR 025](decisions/025_notification_addressing_and_dedupe.md)｜**部署**：[部署檢查表](../engineering_guidelines/deploy_checklist_notification_2026q3.md)

---

## 1. 模組現況

| 層 | 檔案 |
|---|---|
| Schema | `prisma/schema.prisma` — `model Notification`（一張表、零 enum） |
| 常數 | `src/constants/notification.ts` — 型別、待辦型清單、上限、dedupe 前綴、樣式與去處查表 |
| Repository | `src/repositories/notification.repo.ts` — 唯一碰 Prisma 的層 |
| Service | `src/services/notification.service.ts` — 摘要、清單、已讀、四支發射函式 |
| API | `/api/v1/user/notifications`（GET 清單）、`/summary`（GET）、`/read`（POST 全部）、`/{id}/read`（POST 逐則） |
| 前端 | `notification_bell.tsx`（渲染與接線）、`use_notification_summary.ts`（輪詢）、`notification_sound.ts`（出聲判斷） |
| 發射點 | `issue.recorder.service.ts`（分析完成／失敗／放棄）、`scripts/request_wallet_upgrades.ts`（錢包升級待辦） |
| i18n | `src/i18n/locales/{en,ja,ko,zh_cn,zh_tw}/notification.ts` |

通知分兩類，來源刻意不同：

- **待辦型**：團隊邀請（**活算不入庫** —— 邀請被接受／撤回／過期時通知必須同步消失）、錢包升級（入庫，由探針轉 true 收掉）
- **事件型**：分析完成／失敗。入庫，點擊該則才算已讀，已讀後留在清單裡供翻閱

團隊邀請的活算來源是 `team_invitation.service.ts` 的 `listPendingInvitationsForUser`，**小鈴鐺與團隊頁共用同一支** —— 鈴鐺上那則通知點下去正是導到團隊頁，兩邊各查一次的話，症狀會是「通知說有一封邀請，點進去那一頁說沒有」。它同時吃兩條路徑：`inviteeAddress` 相符，或 `inviteeEmailKey` 屬於使用者**已驗證**的信箱。

---

## 2. 缺陷總帳

模組於 `74efaee02` 交付後，逐項盤點與修正的紀錄。**為什麼**寫在 ADR 025 與程式碼註解裡，這裡只留落點。

| # | 缺陷 | 落點 |
|---|---|---|
| D1 | 打開鈴鐺永久吃掉錢包升級待辦，且 `dedupeKey` 讓它補不回來 | 已讀排除待辦型；待辦由 `dismissWalletUpgrade`（探針轉 true）關閉 |
| D2 | 三支 route 零限流，而 summary 是每 60 秒的輪詢端點 | `NOTIFICATION_READ`（30/分、8000/日）與 `NOTIFICATION_WRITE`（20/分、500/日）+ 自帶守門測試 |
| D3 | `bg-surface` / `border-border` 是無效 class → 面板透明無邊框 | 改用 `surface-overlay` / `border-default`；樣式與去處收進常數層查表 |
| D4 | 徽章與清單在未讀超過上限時分岔 | 待辦與事件分兩支查詢；事件型多取一則算 `hasMore` |
| D5 | 空 `address` 會撈出全站待接受邀請 | `listPendingInvitations` 早退（目前不可觸發，但保證哪天可能不成立） |
| D6 | 輪詢沒有 `document.hidden` 停止，也沒擋重疊 | 抽出 `use_notification_summary.ts`：`inFlight` ref + 背景停止 + 回前景補一次 |
| D7 | 多分頁 = 多聲鈴鐺 | `BroadcastChannel` + `ChimeGate` 搶佔 |
| D8 | `playChime` 每次 `new AudioContext()`（Chrome 上限約 6 個，超過靜默失敗） | 模組層單例 + 首次手勢解鎖 + 3 秒節流 |
| D9 | `notifyWalletUpgradeRequested` 會拋而腳本沒有逐人處置 | 契約寫進註解；腳本逐人 try/catch + 失敗清單 + 非 0 exit code |
| D10 | 所有失敗塌成 `IS000099` 且沒有一行 log | `guarded()` 與三支 route 加 `logger.error` |
| D11 | `payload.analysisId` 存了沒用，深連結只做半套 | 連 `/analysis?tab=history`（逐筆 `?analysisId=` 要動 `HistorySection`，未做） |
| D12 | 錢包升級待辦是一個按了沒反應的連結 | `NOTIFICATION_LINK_PATH` 為 `null` → 渲染成不可點的 `<div>`。全站仍無升級頁面 |
| D13 | commit 混入 130 個 `forge_out/` build artifact（95k 行） | `.gitignore` + `git rm -r --cached`（尚未 amend 進原 commit，見 §6） |
| D14 | 最嚴重的三個缺陷不會讓任何測試變紅 | repo 替身改成有狀態的假實作；`codeOf` 剝區塊註解；401 驗精確值；i18n 驗元件實際會讀的每一個鍵 |
| D15 | HR shell 留著一顆 disabled 的假鈴鐺 | 移除（產品決定：這一版 HR 不上鈴鐺） |
| D16 | 分析失敗時使用者什麼都收不到 | `ANALYSIS_FAILED`，綁 `Order.status` 轉 FAILED 的那一次轉換（重試中不發） |
| D17 | 提示音第二次抵達起永久失效 | 抵達識別值改用伺服器端最新未讀時間 —— 完整理由見 **ADR 025 §7.1** |
| D18 | 上鏈提交被拒 3 次寫下 `giveup.md` 後，訂單卡在非終態，完成與失敗都不通知 | `IssueRecorder` 也掃 `giveup.md`：標 FAILED 並通知。修在這裡是因為它是全站唯一寫入訂單終態的地方 |
| D19 | 邀請通知只認 `inviteeAddress`，而 email 邀請那一欄是 NULL —— 已註冊的人被 email 邀請時，**鈴鐺與團隊頁都完全看不到**，而 `TEAM_INVITATION` 一直被列為已支援的型別 | `TeamInvitation.inviteeEmailKey`（canonical、索引）+ 查詢改成位址 **OR** 已驗證信箱。兩個消費者收斂到 `listPendingInvitationsForUser` |

**D17、D18、D19 的共通點值得記著**：三者都躲過了單元測試、e2e 與整份 code review。D17 的失效沒有任何觀測量（搖動照舊、徽章照舊、log 乾淨，唯一症狀是「聽不到聲音」）；D18 與 D19 的失效是「什麼都沒發生」，而沒有人會抱怨一件他不知道應該發生的事。

D19 還多一層：`TEAM_INVITATION` 從第一天就在型別清單、有文案、有去處、有測試，**看起來完全支援** —— 只是那些測試餵給替身的都是位址邀請。「這個型別支援了嗎」的答案是「一半」，而沒有任何地方寫著是哪一半。**三者都是在有人逐條追問接線時才浮出來的。**

---

## 3. 不要改回去的實作決定

| 決定 | 理由 |
|---|---|
| 待辦型**活算不入庫** | 入庫就要在 accept／decline／revoke／expire 四條路徑上記得回收，漏一條就是永遠掛著的假待辦 |
| `type: String` + 常數層 `as const` | Prisma enum 在 `db push` 下新增成員要改 schema；`String` 已滿足「拒絕魔法字串」 |
| 只存 `type` + `payload`，文案在前端 | DB 裡沒有句子、沒有個資、切語言即時生效。「type → 文案」是渲染知識 |
| `readAt DateTime?`，沒有 `status` enum | 兩種狀態不需要 enum；`ARCHIVED` 沒有消費者 |
| WebAudio oscillator，不用音檔 | 專案至今零媒體資產，這個決定讓它繼續是零 |
| 沒有 `accountBookId` | 通知的收件維度是 `User`；真的出現帳本層通知時，要一併決定帳本軟刪除後怎麼辦 |
| 沒有 `NotificationDispatchFailure` | 目前每種通知都是一人一則，沒有 fan-out 就沒有「解析不到收件人」這個狀態 |
| 輪詢 60 秒 | 來源本身是分鐘級事件，且搖動與音效只在計數增加時觸發 —— 輪詢頻率不影響打擾頻率 |
| `id @default(uuid())` | 沒有投遞軌跡表，就沒有「寫入前要先持有 id」的理由 |

---

## 4. 暫不處理（記下觸發條件）

| 缺口 | 什麼時候不能等 |
|---|---|
| 關閉音效／鈴鐺的路徑 | 使用者第一次抱怨，或加入第二種會頻繁觸發的型別。屆時先決定：關的是音效還是整個鈴鐺 |
| 通知保留期限 | 表長到影響 `groupBy` 之前。天數走 ADR 017 簽章設定，且 `UNTRUSTED` 下清除 worker **必須拒絕執行**（刪資料不可逆） |
| 分頁 / `loadMore` | `hasMoreCompleted` 常常是 true 時 |
| 逐筆深連結 `?analysisId=` | 要動 `HistorySection` |
| 「全部標為已讀」按鈕 | 使用者抱怨「看過但沒點的通知一直掛著徽章」時。**`POST /notifications/read` 已存在但目前沒有前端呼叫者** —— 加按鈕或刪端點，二選一 |
| 跨分頁同 tick 競態 | 兩個分頁同時 `claim()` 會都出聲。修它要讓每一聲延遲 150ms，代價不對等（見 `notification_sound.ts`） |
| **邀請待辦「提醒一次」而不是「持續掛著」** | 有人抱怨放著不處理的邀請讓徽章一直亮。活算的待辦沒有已讀狀態，所以做不到「看過就淡掉」—— 那需要入庫，而入庫要連帶要回 `activeUnreadKey`（ADR 025 §5.1）。**觸發條件是抱怨，不是猜測**：持續掛著對「還沒處理的事」是正確行為 |
| **以 passkey 註冊的人收不到 email 邀請的站內通知** | `User` 沒有 email 欄位，email 只存在於第三方綁定。這是能力的上限不是缺陷 —— 除非哪天 `User` 有了可驗證的信箱 |

---

## 5. HR 接線的前置（另一個 PR）

HR 引入的是**第一個 fan-out 情境**，而那會把兩樣東西要回來。

| 前置 | 為什麼 |
|---|---|
| **不可監看 `LeaveRequest.status`** | 沒有 `PARTIALLY_APPROVED`，監看它會漏掉所有中間關卡。唯一可信訊號是 `LeaveApprovalStep.pendingKey` 轉移 |
| **收件人解析要能回報失敗** | `Employee.userId` 可空是刻意的（工地的人可能沒帳號）。fan-out 為 0 人時最容易寫出來的分支是靜默成功，後果是一張假單永遠沒人知道要簽 —— 這是 `NotificationDispatchFailure` 回來的時機 |
| **待辦型需要可回收的鍵** | 簽核待辦在撤回／重送／鏈重展開後要能再發，且**不能**用邀請那套活算 —— 這是 `activeUnreadKey` 回來的時機 |
| **HR 職能 fan-out 目前必然為空** | `EmployeeHrFunctionAssignment` 有讀取來源但沒有指派 API |
| **授權一律走 `managesEmployee()`** | 絕不用 `isDepartmentManager()` —— 後者問「你有沒有管任何部門」，拿它當授權，第一工務段的主管就簽得動第五工務段的人 |
| **照快照發，不要重查** | ADR 023 的自動上升已固化在 `LeaveApprovalStep` 快照裡，重查等於把上升邏輯複製成第二份 |
| **`LeaveRequest` 的假別與 `reason` 在 ADR 018 尚未分級** | 病假、生理假揭露健康狀況，而鈴鐺會在他人看得到的螢幕上彈出。要回報給 ADR 018 |
| **員工維度的通知要拆表** | `EmployeeNotification`，不要在 `Notification` 上加可空 `employeeId` + `recipientKind`（ADR 019 §1 那三種非法狀態會一字不改地回來） |

---

## 6. 離「可上線」還差什麼

**這一節是這份文件唯一的待辦清單**，依風險排序。

1. **rebase 最新 `develop`** —— 落後 133 個 commit，拖越久衝突越多。`coding_guidelines §4.1` 要求發 MR 前在本地解完。這是剩下工作裡風險最高的一項。
2. **`forge_out` 的移除要 amend／rebase 進 `74efaee02`** —— `git show --stat 74efaee02` 仍有 130 項，那 95k 行還在歷史裡。
3. **在 staging 跑一個真的分析**（完成與失敗各一次）—— 見 §6.1。
4. **產品決策未收** —— 需求寫「展開側邊欄」而實作是桌機下拉／手機全螢幕，算不算收斂？鈴鐺該不該出現在薪資計算機頁？
5. **五語系文案沒有母語者複核** —— 驗收只驗了「有沒有值」，沒驗通不通順。
6. **無障礙未驗** —— focus trap、Esc、螢幕閱讀器對徽章數字的朗讀。
7. **效能沒有量過** —— 每 60 秒 × 在線人數 = 兩趟 DB。D17 的修法刻意沒有讓它變成三趟。

### 6.1 手動驗收：15 項過 13 項，剩下兩項為什麼非 staging 不可

20260825 於本機執行，造資料工具是 `scripts/qa_notification_fixtures.ts`（用法見該檔檔頭）。

那支工具呼叫的是 service **真正的發射函式**，所以「摘要 → 清單 → 畫面 → 搖動 → 音效 → 已讀」這條路是真的驗過的。**但「分析真的跑完／真的失敗時，`issue.recorder.service.ts` 到底有沒有呼叫那支函式」沒有驗到** —— 本機造不出一條會跑完的分析管線。把這兩項當成已完成，就是把「替身答對了」記成「系統答對了」。

要驗的兩件事：

- 分析完成 → 60 秒內徽章 +1、鈴鐺搖動、響一聲，且通知帶得出報告名稱
- 分析失敗（含中途重試）→ 收得到失敗通知，且**重試中不發**（只在 `Order.status` 轉 FAILED 的那一次）

### 6.2 重驗時容易做成假綠的三個地方

- **跨分頁只響一次**：要開**三個獨立視窗**。同一視窗的背景分頁根本不輪詢，那樣測等於沒測。
- **背景不輪詢**：要**同時量前景**。只驗「背景 0 次」的話，「根本沒在輪詢」也會通過。實測數字：背景 3m10s 零次、前景 95s 一次。
- **「響了幾聲」不能用聽的**：包一層 `AudioContext.prototype.createOscillator` 數呼叫次數（一聲 = 兩個振盪器），與「搖了幾次」分開計。**D17 就是這樣才看得見** —— 在那之前它的每一個外顯行為都是對的。

### 6.3 順帶發現、不在本模組範圍

`https://isunfa.localhost/` 第一次載入（含 F5）會被導到 `http://localhost:3000/`，而那個 origin 沒有登入狀態 —— 使用者按一次重新整理就看到登出畫面。本機重現 4 次，很穩定。**本次不修**，但 staging 若同樣如此就是個問題。

---

## 附錄 A：與需求原文的對照

| 需求原文 | 現狀 |
|---|---|
| 「位於 Header 的小鈴噹」 | ✅ 掛在 `user_actions.tsx`，覆蓋 user／admin／landing／薪資計算機四個 shell。HR shell 刻意沒有 |
| 「有通知進來時，會有搖晃動畫」 | ✅ 只在計數增加時觸發一次；`prefers-reduced-motion: reduce` 下停用 |
| 「和提示音」 | ✅ WebAudio 兩聲短音；autoplay 政策下靜默降級；跨分頁只響一次 |
| 「點擊後會展開側邊欄」 | ⚠️ 桌機下拉 / 手機全螢幕，形狀沿用同一個 header 的 `user_actions.tsx`。**算不算收斂待產品確認** |
| 「當 AI 任務完成時會通知主動用戶」 | ✅ 完成、失敗、放棄三種終態都通知，且帶得出報告名稱。⚠️ 發射點本身尚未在真流程下驗證 |
| 「並導向對應的頁面…附上連結按鈕」 | ✅ 連 `/analysis?tab=history`。逐筆深連結未做（§4） |
| 「此功能也會串接未來的人事管理模組」 | 資料模型接得住；fan-out 會要回兩張表（§5） |

**同步接線的 AI 功能**：分析報告、AI 顧問室、運輸碳足跡計算機、憑證分析都走 Order + Analysis 管線，因此都會通知。DPP 模擬器與各種 chat 是同步串流，使用者在同一個請求裡就看到結果 —— **刻意不接鈴鐺**。
