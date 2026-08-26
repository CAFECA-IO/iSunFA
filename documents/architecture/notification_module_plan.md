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
| 型別 | `src/interfaces/notification.ts` — **端點 payload 的單一事實來源**（service、hook、三個畫面消費者都讀它；D26） |
| 常數 | `src/constants/notification.ts` — 型別、待辦型清單、上限、dedupe 前綴、樣式與去處查表 |
| Repository | `src/repositories/notification.repo.ts` — 唯一碰 Prisma 的層 |
| Service | `src/services/notification.service.ts` — 摘要、清單、分頁歷史、已讀、四支發射函式 |
| API | `/api/v1/user/notifications`（GET 清單）、`/summary`（GET）、`/history`（GET 分頁）、`/read`（POST 全部）、`/{id}/read`（POST 逐則） |
| 前端 | `notification_bell.tsx`（面板）、`app/user/notifications/page.tsx`（完整清單）、`notification/notification_row.tsx`（**兩者共用的列**）、`use_notification_summary.ts`（輪詢）、`notification_sound.ts`（出聲判斷） |
| 發射點 | `issue.recorder.service.ts`（分析完成／失敗／放棄）、`scripts/request_wallet_upgrades.ts`（錢包升級待辦） |
| i18n | `src/i18n/locales/{en,ja,ko,zh_cn,zh_tw}/notification.ts` |

通知分兩類，來源刻意不同：

- **待辦型**：團隊邀請（**活算不入庫** —— 邀請被接受／撤回／過期時通知必須同步消失）、錢包升級（入庫，由探針轉 true 收掉）
- **事件型**：分析完成／失敗。入庫，點擊該則才算已讀，已讀後留在清單裡供翻閱

面板只帶回最近 **10** 則（產品決定 20260826；曾為 20 → 30，理由的變遷見 `constants/notification.ts`），超過的部分在 `/user/notifications` 分頁翻閱；面板底部的連結常駐（只在被截斷時才出現的話，這個頁面就只有通知夠多的人發現得了）。兩個畫面的每一列都經過 `notification_row.tsx`：文案、圖示、去處、未讀紅點只有那一個檔案說得算，`notification_bell_wiring.test.ts` 以「消費端不得出現 `NOTIFICATION_TYPE_STYLE` 等符號」把這件事釘住。

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
| D15 | HR shell 留著一顆 disabled 的假鈴鐺 | 移除（產品決定：這一版 HR 不上鈴鐺）。**當時刪過頭，見 D24** |
| D16 | 分析失敗時使用者什麼都收不到 | `ANALYSIS_FAILED`，綁 `Order.status` 轉 FAILED 的那一次轉換（重試中不發） |
| D17 | 提示音第二次抵達起永久失效 | 抵達識別值改用伺服器端最新未讀時間 —— 完整理由見 **ADR 025 §7.1** |
| D18 | 上鏈提交被拒 3 次寫下 `giveup.md` 後，訂單卡在非終態，完成與失敗都不通知 | `IssueRecorder` 也掃 `giveup.md`：標 FAILED 並通知。修在這裡是因為它是全站唯一寫入訂單終態的地方 |
| D19 | 邀請通知只認 `inviteeAddress`，而 email 邀請那一欄是 NULL —— 已註冊的人被 email 邀請時，**鈴鐺與團隊頁都完全看不到**，而 `TEAM_INVITATION` 一直被列為已支援的型別 | `TeamInvitation.inviteeEmailKey`（canonical、索引）+ **查詢**改成位址 **OR** 已驗證信箱，兩個消費者收斂到 `listPendingInvitationsForUser`。**處置端見 D21** |
| D20 | 面板底部「還有更多**未讀**通知」是一句假話，而且沒有出口 —— 清單改成含已讀之後，該旗標的意思已變成「歷史超過上限」，於是它會在未讀只有 2 則的畫面上宣稱還有更多未讀，與兩公分外的徽章直接矛盾 | 鍵改名 `has_more_completed` → `history_capped`（「僅顯示最近 N 則」，恆真）；底部加常駐連結通往新的 `/user/notifications` 分頁清單 |
| D21 | D19 只修了查詢那一半：accept／decline 仍是 `inviteeAddress` 比對，而 email 邀請那一欄是 NULL —— 鈴鐺推一則待辦、團隊頁畫兩顆按鈕、兩顆都必定失敗（D12 的形狀）。順帶查出兩支**都沒有逾期檢查** | 抽 `resolveRecipientKeys` + `canActOnInvitation`，查詢／接受／拒絕三處同源；同時補上 `isInviteExpired`；email 路徑的 `emailMatch` 記為 `MATCHED` 而非 null |
| D22 | 完成通知在 DB 同步**之前**無條件發出，而同步失敗會把訂單寫成 FAILED 並再發一則失敗通知 —— 同一份工作同時收到「已完成」與「失敗」，兩則的 `dedupeKey` 都是永久唯一鍵，收不回也蓋不掉 | 完成通知移到同步之後，條件為 `finalOrderStatus !== FAILED`（**不是** `newOrderStatus === COMPLETED`，理由見下） |
| D23 | 點面板裡的團隊邀請會扣錯徽章的桶（`completedCount`，但邀請屬 `todoCount`）、把提示音基準降 1 造出一次幽靈搖動、並對合成 id 打 `POST .../invitation:<uuid>/read` —— 活算待辦的 `readAt` 恆為 null，`markOneRead` 的早退擋不住它 | 判斷抽成 `lib/notification_read.ts` 的 `canMarkReadByClick`（以**待辦型**為準，不是以「活不活算」），由 `notification_row.tsx` 單點決定，與伺服器端 `markReadById` 的 `excludeTypes` 讀同一份常數 |
| D24 | 執行 D15 時連使用者選單一起刪了：`MenuItems`、**登出按鈕**、員工編號與職稱副標，換成一顆 `disabled` + `feature_pending` 的頭像按鈕。HR shell 因此沒有任何登出路徑（`grep -rn logout` 在 `hr_management` 底下零命中），而共用平板換人時前一個人的 session 會留著 | 依 develop 原樣還原選單，只保留鈴鐺的移除；補三條「留下了什麼」的測試（登出可用、`MenuButton` 不是 disabled、顯示得出員工編號與職稱） |
| D25 | 限流只有掃描證據，沒有接線證據：刪掉 route 裡的 `if (limited) return limited;`（保留呼叫那行）→ 五支端點限流完全失效，而兩支守門測試全綠。ADR 025 §7 宣稱「本模組自帶 `notification_rate_limit.test.ts`」，那句話當時不成立 | 在同一支測試補行為那一半（照 `invite_route_wiring.test.ts` 的手法）：打滿桶 → 429 **且** service 沒有被多呼叫一次；五支端點以表格驅動，另加「三支讀取共用一桶」與「讀取桶不影響寫入桶」 |
| D26 | summary 的端點契約沒有守 `latestUnreadAt`：替身只回兩個計數，斷言又用 `toEqual` 把「payload 只有兩個欄位」主動釘住，而 hook 另外重新宣告一份型別再用泛型硬轉。把 route 改成 `jsonOk({ todoCount, completedCount })` → tsc / test / e2e 全綠，**D17 原樣復活** | 型別搬到 `src/interfaces/notification.ts` 當單一事實來源（service、hook、鈴鐺、通知頁、列元件全部改讀它）；替身照實回三個欄位、`toEqual` 連 `latestUnreadAt` 一起釘；另加「hook 真的把它餵給 `arrivalKeyOf`」把鍊子的第二段也接上 |
| D27 | 版面重排順手刪掉 `emailMismatch` 徽章：後端 `attachEmailMismatch` 仍在算、五語系文案仍在、`invite_email_mismatch_visibility.test.ts` 仍全綠，只有畫面那一格不見了 —— owner/admin 從此看不到「這個人是用不符的信箱進來的」 | 還原徽章；註記它為何存在（接受邀請不綁身分是刻意的，所以這個訊號更需要被看見） |
| D28 | **`canonicalizeEmailForKey` 被賦予授權用途**：它一律去除子地址，而那個取捨是為**唯一鍵**評估的（寧可多合併）。用來決定「這封邀請要不要顯示／能不能接受」方向相反 —— 自建網域上 `bob+x@corp.com` 與 `bob@corp.com` 可以是兩個人，後者只要有已驗證信箱就看得到、（B1 之後）還能接受不是寄給他的邀請 | 新增 `normalizeEmailForCompare`（只 trim + lowercase）供判定；canonical 仍是查詢索引（它是精確相等的必要條件，撈出來是超集不會漏），收斂在 `isIntendedRecipient` |
| D29 | `/api/v1/user/team/invitations` 無限流，而它現在與鈴鐺共用同一支查詢、同樣兩趟 DB —— `NOTIFICATION_READ` 的 30/分多了一條等價旁路 | 收進**同一個** `NOTIFICATION_READ` 桶（分兩個桶等於把上限乘二），並補一條行為測試釘住它不是旁路 |
| D30 | 訂單終態被自動流程覆寫：兩處守門都是「不是 FAILED 就寫成 FAILED」，於是已 `COMPLETED` 的多任務訂單、或使用者已 `CANCEL` 的訂單，會因為一個任務被放棄／同步失敗而被改成 FAILED 並發失敗通知 | 新增 `TERMINAL_ORDER_STATUSES` 與 `isTerminalOrderStatus`，成功路徑與放棄路徑**同時**改；旗標訊息也改成寫實際發生的事 |
| D31 | `request_wallet_upgrades.ts` 的健全性警告只寫在預演分支，`--commit` 沒有 —— RPC／chainId 指錯鏈時 `eth_call` 回 `0x` 被判為 false，於是對全站每個人發一則永久、收不回的待辦。部署檢查表 §2.1「『無法判定』不是 0 就不要 `--commit`」完全沒進到程式裡 | 改成兩段式（先全部探完，再決定動作）；兩道守門（無法判定 > 0、全體都判為尚待升級）在兩種模式都算，`--commit` 時**中止**而非警告後照跑 |
| D32 | `dismissWalletUpgrade` 與 `listUsersWithPendingWalletUpgrade` 是本檔唯二沒包裝的匯出，原始 Prisma 錯誤會被腳本原文印進 stderr（連線字串、表結構） | 新增 `guardedThrowing` 與 `NotificationOperationError`：**保留可拋性**（腳本的逐人 try/catch 與 exit code 靠它），但記結構化 log、原因留在 `cause` |
| D33 | `qa_notification_fixtures.ts` 的正式機隔離只認 `NODE_ENV`，而決定連哪個 DB 的是 `DATABASE_URL`；這支有 `--clear --yes` 的硬刪路徑 | 第二道守門看 `DATABASE_URL` 的實際主機，非本機一律擋下，要繞過得明確帶 `ALLOW_NON_LOCAL_QA_FIXTURES=1` |
| D34 | 面板在 `list === null`（載入中／載入失敗）時渲染「目前沒有通知」，而 `openList` 的 catch 還把失敗寫成空清單 —— API 掛掉時面板斬釘截鐵地說沒有通知，徽章旁邊可能正寫著 5 | 三態分開（loading／error／ready）；失敗不再偽造空清單，有舊內容時顯示舊內容並標明「讀取失敗」 |
| D35 | `aria-label` 是固定字串，而它**覆蓋**按鈕內容包括徽章 —— 讀屏使用者永遠聽不到有幾則 | 未讀 > 0 時改用 `aria_unread`（帶 count）；零則時維持原句 |
| D36 | 手機全螢幕面板沒有 focus trap，鍵盤／讀屏會 Tab 進被蓋住的頁面內容 | `PopoverPanel` 加 `modal`（HeadlessUI 2.2 支援），不改寫成 `Dialog` 以免動到桌機下拉 |
| D37 | 「型別 → 文案」的 switch 閉包了 `t`，export 不出去也就一條都測不到；且 `item.type as NotificationType` 對 API 字串硬轉，安全與否取決於相隔數行的早退 | 抽成 `lib/notification_message.ts`（`t` 變參數）＋ `isNotificationType` 型別守衛；新增 20 條純函式測試 |
| D38 | 手機版面板捲不到底，底部「查看全部通知」點不到 —— 捲動區是 `flex-1 overflow-y-auto` 但少了 `min-h-0`，而 flex item 的 `min-height: auto` 讓它長到跟內容一樣高、把 `h-dvh` 的父層撐破，`overflow-y-auto` 因此永遠不生效 | 加 `min-h-0`；底部連結補 `env(safe-area-inset-bottom)`；兩條掃描測試分別釘住「捲動區有 min-h-0」與「連結在捲動區之外」 |
| D39 | 為了補 focus trap 加的 `PopoverPanel modal` 讓手機版**完全捲不動** —— 它啟動的 scroll lock 在觸控裝置上靠攔截 `touchmove`，認得 `Dialog` 的面板但未必認得 `PopoverPanel` 的 | 移除 `modal`（focus trap 退回未做，正解是改寫成 `Dialog`）；底部連結改成手機版 `fixed bottom-0` 貼齊螢幕底緣，位置不再依賴任何祖先的高度 |
| D40 | **手機版面板捲不動、底部按鈕點不到的真正成因**：三個掛鈴鐺的 shell 其 `<header>` 都有 `backdrop-blur-xl`，而 `backdrop-filter` 與 `transform` 一樣會讓元素成為子孫 `position: fixed` 的**包含塊** —— 面板的 `fixed inset-0 h-dvh` 因此相對那個 64px 的 header 定位（實測 top=7742px，視窗高 1083），底部連結跟著跑到清單上方。D38／D39 的兩次修補都只是在症狀上打轉 | 毛玻璃移到 `absolute inset-0 -z-10` 的兄弟層，`<header>` 不再是包含塊；面板回到單純的 flex 版面；底部入口改成品牌色實心按鈕 + 箭頭（先前與分節標題同樣式，使用者讀成列表標題） |

**D17、D18、D19 的共通點值得記著**：三者都躲過了單元測試、e2e 與整份 code review。D17 的失效沒有任何觀測量（搖動照舊、徽章照舊、log 乾淨，唯一症狀是「聽不到聲音」）；D18 與 D19 的失效是「什麼都沒發生」，而沒有人會抱怨一件他不知道應該發生的事。

D19 還多一層：`TEAM_INVITATION` 從第一天就在型別清單、有文案、有去處、有測試，**看起來完全支援** —— 只是那些測試餵給替身的都是位址邀請。「這個型別支援了嗎」的答案是「一半」，而沒有任何地方寫著是哪一半。**三者都是在有人逐條追問接線時才浮出來的。**

**D20 是另一種形狀，值得單獨記**：它不是漏了什麼，是**一句話的意思在它腳下被改掉了**。`hasMoreCompleted` 這個旗標本身從頭到尾都算得對，改的是它的來源查詢（只撈未讀 → 含已讀），而綁在它上面的那句文案沒有人想起要跟著改。五個語系、五份假話，`tsc` 與 `lint` 都不會有意見，既有測試只驗「這個鍵存在」。

可推廣的判準：**改一支查詢的語意時，要一併找出所有「解釋」那支查詢結果的文案**。程式碼的呼叫端編譯器找得到，文案的呼叫端找不到。

**D21 則是 D19 的第二段**，而它躲掉的方式值得記：D19 的修法本身沒有錯，錯在**收斂的範圍比宣稱的小**。總帳原本寫「兩個消費者收斂到 `listPendingInvitationsForUser`」——那句話是真的，但那兩個消費者都是**查詢**的；同一個問題（「這封邀請是不是給你的」）在**處置**端還有第二個、不同的答案，而沒有任何測試同時看得到兩邊。

可推廣的判準：**放寬一個查詢的收錄範圍時，要問「查得到的東西，是不是每一個動作都處理得了」**。查詢與處置各自都自洽，分岔只在兩者之間，因此逐檔 review 看不出來 —— 要沿著「使用者看到之後會按什麼」走一遍。

D21 順帶暴露的逾期缺口更是這個形狀的極端：`accept` 從來沒檢查過 `expiresAt`，而它在既有路徑上完全無害（位址邀請不設期限）。**只放寬收件者判定而不補那一道，才會把一個一直存在的死條件變成活的漏洞** —— 逾期三個月的 email 邀請仍可接受並佔掉一個付費席次。

**D22 的修法有一個容易踩的坑，記在這裡**：直覺的對稱寫法是「移到 `orderRepo.update` 之後，條件改成 `newOrderStatus === COMPLETED`」，與失敗那則並排。那樣會修掉矛盾，但**換來一個靜默的漏**：`Analysis.orderId` 沒有唯一約束，一張訂單可以有多個分析（`findByOrderIdAndTaskId` 以 `missionTaskId` 對應），而 recorder 一次只處理一個 task。前幾個 task 完成時 `newOrderStatus` 是 `EXECUTING`，只有最後一個才是 `COMPLETED` —— 前面每一份分析的完成通知都不會發。

兩個通知**本來就不同粒度**：完成是 analysis 級（key 是 `analysisId`），失敗是 order 級（key 是 `orderId`）。「對稱」在這裡是個誤導人的直覺。要判的是「**這一輪**有沒有踩到同步失敗」，那個變數是 `finalOrderStatus`。

D22 沒被測試抓到的原因也值得寫清楚，因為它會影響下一次怎麼補測試：**不是因為 `notification.service` 被 mock 掉了**（那是對的，checklist §1.2 允許，而 `notification_service.test.ts` 直接測那一支）。是因為 `issue_recorder_giveup.test.ts` 的五條案例全都走 giveup 路徑，**沒有任何一條走過 DB 同步失敗**。替身早就準備好回答「有沒有發完成通知」，只是從來沒有人問。

**D23 是 D17 的同族，而且更值得記**：三個錯誤行為沒有一個在畫面上顯示成錯的 —— 徽章少 1（看起來像正常的已讀）、鈴鐺搖一下（看起來像來了新通知）、一個失敗的 POST（沒有任何 UI）。手動驗收之所以看不到，是因為最容易驗的空狀態剛好抵銷：`completedCount` 為 0 時 `Math.max(0, -1)` 還是 0，徽章不動。**幽靈搖動要 `completedCount ≥ 1` 才出得來。**

修法選「待辦型」而不是 review 建議的「活不活算（`derived`）」，理由是後者修不掉錢包升級：它是**入庫的**待辦型，今天碰不到只因為 `NOTIFICATION_LINK_PATH` 給它 `null`；而那一欄的註解寫著「有了升級頁面之後把它填進來」。填進去的那天，同一個缺陷會以 D1 的形式回來 —— 點一下就把一則還沒處理的待辦標成已讀，而 `dedupeKey` 是永久唯一鍵。

還有一個可推廣的判準：**兩個消費者犯同一個錯，代表那個判斷不該放在消費端**。B3 在小鈴鐺與 `/user/notifications` 各發生一次，而它們是同一天寫的、由同一個人寫的 —— 判斷留在呼叫端就是留給每一個新呼叫端再錯一次的機會。它被移進 `notification_row.tsx`，與「這一型有沒有去處」並列，因為那是同一類決定。

**D24 是這批裡最便宜也最危險的一個**：它不需要任何巧合就會發生，而後果是一個安全性後果（共用平板上的 session 留給下一個人）。它躲過測試的方式只有一句話：守門的測試只寫了 `expect(hrHeader).not.toMatch(/<Bell\b/)`。

**D25 與 D24 是同一個病的兩種樣子**：測試斷言的是「原始碼長什麼樣」，而不是「系統做了什麼」。D24 驗刪掉了什麼（於是刪過頭不會紅），D25 驗寫了什麼（於是寫了但沒生效不會紅）。兩者都通不過同一個問題：**把這條斷言改成綠的最省力方式，是不是修好了東西？**

掃描與行為兩種測試都要留，因為它們防的是不同的退化：掃描擋得住「新增端點忘了加限流」（行為測試沒列舉到的端點不會紅），行為擋得住「加了但沒 return」（掃描看不出來）。所以 D25 是**補**上另一半，不是把掃描換掉。

行為測試本身也有個容易做成假綠的地方，一併記著：只斷言 429 不夠 —— 「擋下來」與「擋了但還是做了」的回應可以一樣。必須同時斷言 service 的呼叫次數沒有增加。

**D26 是這一批裡最值得記的一個**，因為它示範了「測試不只是沒抓到，而是主動幫忙掩蓋」：`toEqual({ todoCount, completedCount })` 不是漏寫，它是一句**斷言 payload 只有兩個欄位**的話。而端點真的少回一個欄位時，這句話會變成綠的。

判準：**`toEqual` 對著一個手寫的物件字面量，等於把當下的形狀變成契約。** 那正是你要的（契約測試）——但前提是那個字面量與真實回應一致。替身少一個欄位、斷言跟著少一個欄位，兩者自洽而且都與真的不一樣，於是這一組測試從守門人變成幫兇。

第二個判準：**型別重複宣告的地方，就是自動偵測的斷點。** D26 的鍊子有兩段，而兩段都靠型別接住：端點 → payload（service 那份）、payload → `arrivalKeyOf`（hook 那份）。兩份各自宣告時，中間那個接縫誰都不看。這也是為什麼修法是把型別搬到 `interfaces/` 而不是讓 hook 去 import service —— 後者會把一個 client component 的 import 圖連到 Prisma。

**D38 值得記的不是那個 CSS 屬性，是它的發現方式**：它躲過了 tsc、lint、306 支測試套件與整份 code review，而使用者打開面板的第一秒就看見了。原因是它的失效條件是「內容夠多 **且** 視窗夠小」—— 兩個條件都不在任何自動化的預設情境裡。

**D38 與 D39 加起來還有第二個教訓**：面板底部那個連結的位置，先前依賴「祖先的高度算對了」這個前提，而那個前提在真實裝置上被打破了**兩次**——一次是 `h-dvh` 被內容撐破（D38），一次是 scroll lock（D39）。改成 `fixed bottom-0` 之後它不再依賴那個前提，也就不會被它壞第三次。

**D40 推翻了 D38 與 D39 的診斷**，而那件事本身才是這一段最該記的：同一個症狀我連猜三次（`min-h-0`、`fixed bottom-0`、移除 `modal`），每一次都有合理的理論、每一次都改了程式、每一次都沒修好。真正的成因在**另一個檔案**裡 —— 一個與通知模組無關的共用 header。

轉折點是停止推理、去瀏覽器裡量。兩個探針、不到一分鐘：把同樣的結構放進帶 `backdrop-filter` 的 header，面板 top 是 7742px；把毛玻璃移到子層，top 是 0、頁尾貼在 1059–1083。那是推理給不出的答案，因為前提（「`fixed` 相對視窗」）錯了，而錯的前提推不出對的結論。

可推廣的判準：**改了兩次沒修好，就不要改第三次 —— 去量。** 症狀重現得越穩定，量測的代價就越低，而猜測的代價會隨著每一次「合理但錯誤」的修補累積成技術債（D38 的 `pb-14`、D39 的 `fixed bottom-0` 都是為了繞過一個不存在的問題而加的）。

第二條：**`transform`、`filter`、`backdrop-filter`、`will-change`、`contain` 都會把 `position: fixed` 的包含塊從視窗換成該元素。** 這在桌機下拉版面上完全看不出來（面板本來就是 `absolute` 相對按鈕），只有全螢幕的手機版會炸 —— 又一個「只有真的用手操作才看得到」的失效。

判準：**當同一個東西被同一類原因壞第二次時，該換的是那個依賴，不是再修一次成因。**

還有一條關於我自己的：D39 是我上一輪「順手」加的 `modal` 造成的，而我當時在註解裡寫了「⚠️ 需要瀏覽器實測」就交出去了。**寫下「這個沒驗過」不等於驗過了** —— 一個改善型的改動（focus trap）造成了一個功能性的損壞（捲不動），而那個交換在任何情況下都不划算。改善可以等，壞掉不能。

這也是為什麼 §6 的「瀏覽器實測」不能因為測試全綠而跳過。同一份清單上還躺著 `modal` 的 focus trap 與桌機下拉行為，那兩項的失效條件同樣是「只有真的用手操作才看得到」。

**D28 是這整批裡最該記住的一條**，因為它不是「寫錯了」，是**一支正確的函式被用在它沒有被評估過的用途上**。`email_identity.ts` 的檔頭自己就寫著：

> ⚠️ 這個取捨對**鍵**與**稽核比對**的方向其實相反：鍵那一側寧可多合併，比對那一側多合併會漏報。

而 D19／B1 把它接上了**第三個**用途——授權——而那一側多合併的後果比前兩者都嚴重：不是漏報一次稽核，是別人的團隊被陌生人看見、加入。那行 ⚠️ 已經預告了危險，卻沒有阻止它，因為它列舉的是「鍵」與「稽核」兩種用途，而新用途不在清單上。

可推廣的判準：**沿用一支既有函式時，要去讀它當初為了什麼取捨、朝哪個方向容錯**——尤其當它的註解裡有「兩害相權」這種字眼時。那句話是為某一組後果寫的，而你的用途未必是同一組後果。

D27 與 D24 則是同一件事的第二次發生：**大改動稀釋 review 表面，護欄就消失在「順手」裡。** 兩次都不是有人決定要移除，而是版面重排時那幾行剛好在改動範圍內。

**D30 有一個容易忽略的細節**：那道守門在成功路徑與放棄路徑各有一份，而放棄路徑那份是**從成功路徑複製過去的**。只修被 review 指名的那一處，等於留著原版讓下一個人再複製一次。修的時候要問「這段是從哪裡來的」，而不只是「這段哪裡錯」。

**D31 是「文件寫了但程式沒寫」的標準形狀**：部署檢查表 §2.1 已經寫著「『無法判定』不是 0 就不能加 `--commit`」，而那句話只在**有人記得讀它**的時候成立。這一類規則的價值與它離程式的距離成反比 —— 而這一條的代價是全站每個人收到一則永久、收不回的通知。判準：**一條寫在文件裡的守門條件，如果它保護的東西不可逆，就該同時是一行 code。**

D31 順帶暴露了原本結構的問題：探針與動作寫在同一個迴圈裡，於是任何「看完全部才能下的判斷」都只可能出現在事後。**要在動作之前判斷的東西，就不能與動作同一輪。**

**「只驗刪掉了什麼」的測試，擋不住刪過頭。** 每一條這種斷言都要配一條「留下了什麼」——否則把整個檔案清空也是綠的。這一條被誤刪的註解本身就是證據，它原本寫著：

> `// Info: (20260818 - Julian) 不標 feature_pending：灰掉會讓人不去點它，而登出就在裡面`

註解被刪掉之後，那個警告只存在於 git 歷史裡，而下一個人看到的是一顆看起來很合理的 disabled 頭像鈕。**寫下理由不足以保住它 —— 理由與程式碼在同一個 diff 裡，會一起被刪。** 能保住它的只有一條會紅的測試，所以那行警告現在同時存在於註解與 `notification_bell_wiring.test.ts`。

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
| 「全部標為已讀」按鈕 | 使用者抱怨「看過但沒點的通知一直掛著徽章」時。端點與 service **已於 20260826 移除**（逐則已讀上線後零呼叫端，而留著要養限流登記、兩支測試的條目與一段描述已取消行為的註解）。要加回來時：`notificationRepo` 也要補回一支整批標記，且**必須排除待辦型**（D1），並記得逐則已讀的桶是 20/分 —— 這顆按鈕存在的理由之一正是讓使用者不必連點 30 次 |
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
4. **產品決策未收** —— 需求寫「展開側邊欄」而實作是桌機下拉／手機全螢幕，算不算收斂？鈴鐺該不該出現在薪資計算機頁？（20260826 補：完整清單已獨立成 `/user/notifications`，「面板放不下」這一半的壓力已經卸掉，剩下的是面板形式本身。）
5. **五語系文案沒有母語者複核** —— 驗收只驗了「有沒有值」，沒驗通不通順。
6. **無障礙** —— `aria-label` 已改成帶未讀數（先前是固定字串，而 `aria-label` **覆蓋**按鈕內容，讀屏使用者永遠聽不到有幾則）；Esc 與焦點歸位本來就有。**focus trap 仍未做**：`PopoverPanel` 的 `modal` 試過，它會啟動 HeadlessUI 的 scroll lock，而那在觸控裝置上靠攔截 `touchmove`，連面板自己的捲動一起擋掉（實測手機完全捲不動，已移除並加測試擋它回來）。正解是改寫成 `Dialog` —— 它本來就管好 scroll lock 與捲動容器的對應，**那是一次獨立的改動**。
7. **效能沒有量過** —— 每 60 秒 × 在線人數 = 兩趟 DB。D17 的修法刻意沒有讓它變成三趟。分頁歷史另開一支端點也是同一條考量：`count()` 只由真的要翻頁的人付。
8. **`/user/notifications` 尚未瀏覽器驗收** —— 翻頁、頁碼夾回最後一頁、待辦區與歷史區同時有資料、空狀態、時間戳格式。同一批未驗的還有未讀紅點、逐則已讀、綠色完成圖示與邀請通知（都是 20260825 之後改的）。

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
