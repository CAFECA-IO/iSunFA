# 明文模式仍要求公鑰:帳本會話未解鎖時「讀得到但存不了」

> **狀態**:🟡 部分完成 2026-08-04 —— 治本已做;**附帶的「還原失敗永不重試」未做**。依據:`2026-08-04_retrospective.md`

**Labels**: bug, carbon, P1
**發現**: 2026-08-03,追「切房是否中斷」時一併查出

---

## 讀寫兩條路對金鑰的要求不對稱

**還原**(`use_carbon_chat` 盤查狀態還原 effect)——帳本會話明文模式**免金鑰**:

```ts
const isBookBound = Boolean(sessionAccess[chatChannel]?.accountBookId);
if (!isBookBound && (!isUnlocked || !master)) return;
```

**保存**——一律需要金鑰,而且這不是前端寫鬆了。PUT 的 schema
(`CarbonReportDraftPutSchema`,盤查狀態沿用同一份)把 `recipientPublicKey` 訂為必填,
即使走 `plainContent` 明文分支:

```ts
recipientPublicKey: z.string().min(1).max(300),   // 沒有 .optional()
plainContent: z.string().min(1).max(2_000_000).optional(),
```

`saveInventoryState` 因此在明文分支也得取 `masterKey.extendedPublicKey`。
所以「帳本會話免金鑰」只實現了一半 —— **讀免,寫不免**。

頁面那行 `const isReportReadable = isUnlocked || !!accountBookId;`
更確認免金鑰是刻意的設計意圖,只是寫入路徑沒跟上。

## 後果

帳本會話未解鎖時:匯入、勾稽、桑基圖當下全部正常,**重載後 ledger 消失**,
而且原本連提示都沒有——那個 effect 直接 `return`,連 request 都沒發出,catch 也不會觸發。

對比報告草稿:它至少會 `setSaveStatus("local")` 告知「僅暫存本機」。

## 已做的止盲(非治本)

盤查狀態的保存 effect 在無金鑰時改為 `setSaveStatus("local")`,
讓「只在記憶體」看得見。**這不解決根因**,只是不再騙人。

## 治本

`recipientPublicKey` 在 `plainContent` 模式下改為選填,前端明文分支即不需要 master。

**風險**:動的是 API 契約。需先確認其他呼叫端(報告草稿 PUT、sessions bind)
是否依賴那個必填,以及後端是否用它做任何授權或索引。schema 是共用的
(`CarbonInventoryStatePutSchema = CarbonReportDraftPutSchema`),兩條路會一起變。

## 相關

- 還原失敗後該 channel 永不重試(`inventoryRestoredChannelsRef` 已加入但版本未設),
  同樣造成保存靜默停擺 —— 建議一併處理,分成 `attempted` / `succeeded` 兩個集合。

---

## 處置(2026-08-03,commit 1a58bc9e5)

治本已做:`recipientPublicKey` 在 schema 改為選填,並加 refine 要求
「有 `envelope` 時必填」;兩個 route 以 `?? sessionUser.address` 補齊後才進 service。
明文分支因此不需要 master key。

「相關」那條(還原失敗永不重試)**已於 2026-08-06 完成**(commit `c7807209d`):

- 拆成 `inventoryLoadAttemptedRef`(防同一輪重複發射)與
  `inventoryLoadSettledRef`(已有結論、再試也一樣)。
- 「記錄存在但解不開」記為 settled —— 金鑰不對就是不對,重試只會每次切房多一次無用請求。
- 真正的 `catch`(沒有結論:網路抖動、伺服器暫時不可用)從 attempted 移除,
  下次進到這個房間會重試。
- **界線寫進註解**:這不是自動重試,effect 的依賴沒變不會自己重跑;
  只是不再把一次失敗變成永久失敗。真正的自動重試要另外做。
- 順帶把自動保存的閘門從 attempted 改成 settled:條件是「已經讀到過庫裡的內容」,
  不是「發過請求」—— 拿在途狀態當閘門,等於可能以還沒讀完的空狀態去蓋掉庫裡的資料。

同 commit 也修掉本票在 `use_carbon_chat.ts` 留下的**過時註解**:
那段寫「保存時 PUT 的 schema 仍硬性要求 recipientPublicKey,因此一律需要 master」
並把該行標為「止盲不是治本」—— 那句話在 20260803 治本的同一天就不再成立。
改了實作沒改註解,而留著錯的註解比沒有註解更貴:
下一個人會以為根因還在,去追一張早就關掉的票。

**本票可關。**
