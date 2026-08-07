# 匯入進度沒有釘住發起的會話,且提示只有一格

> **狀態**:🔴 僅止盲 2026-08-04 —— 加了存活訊號,**根因兩項未修**。依據:`2026-08-04_retrospective.md`

**Labels**: bug, carbon, P1
**狀態**: **DONE(2026-08-06,commit `c88326d6b`)** —— 兩個根因都已處理
**發現**: 2026-08-04 實測(切房回來看不出還在不在跑,使用者重新上傳)
**相關**: `03_import_session_binding.md`(階段二的收尾即為本票)

---

## 處置摘要(2026-08-06)

| 項 | 作法 |
| :-- | :-- |
| 根因一 `reportProgress` 沒帶 sessionId | `runImportChapters` / `runGapFillSections` 改為由呼叫端**注入**已釘住 sessionId 的 `notify`;結構圖階段(`applyPendingImport`)與 `retryFailedImportChapters` 各自釘一個。函式只管回報,不管人在哪 |
| 根因二 提示只有一格 | `draftNoticeState` → `Record<sessionId, IDraftNotice>`;`draftNotice` 由 `draftNoticeBySession[activeSessionId]` 導出;清除時移除鍵而非留 null |
| (額外)自動消失計時器也只有一格 | 同樣清錯房間 —— 改為逐會話一個;並把散在七處的 clearTimeout/setTimeout 樣板收成 `dismissDraftNoticeAfter` |
| (額外)待決的自動消失沒被新提示作廢 | 移進 `setDraftNotice`:設新提示即取消該房待決的計時器。原本靠呼叫端自己記得,只有一處寫了 |

測試:`reduceDraftNotice` 抽成純函式,`src/__tests__/carbon_draft_notice.test.ts` 6 條,
核心是反向測試「寫 B 房不得動到 A 房」。
症狀是「畫面看起來沒事」,人工測最容易漏。

以下保留原始分析。

---

## 現象

切到別的聊天室再切回來,匯入進度提示可能整個消失,或停在切走那一刻的數字。
使用者無從判斷解析是否還在進行,只能重新上傳。

## 兩個獨立成因

### 一、`reportProgress` 沒帶 sessionId

`importReportFile` 已經釘住發起的會話:

```ts
const originSessionId = activeSessionId;
const notify = (notice: IDraftNotice | null) =>
  setDraftNotice(notice, originSessionId);
```

但 `runImportChapters` 是另一個 `useCallback`,裡面的 `reportProgress`
直接呼叫 `setDraftNotice(notice)`,**沒有第二個參數**:

```ts
const reportProgress = () => {
  setDraftNotice({ type: "loading", text: t(...) });   // ← 沒帶 sessionId
};
```

`setDraftNotice` 省略 sessionId 時取 `activeSessionIdRef.current`,
也就是「使用者當下所在的房間」。所以中途切到 B 房,A 房的解析進度會寫到 B 房去。

**釘住這件事在函式邊界斷掉了** —— 20260803 的階段二只改了 `importReportFile`,
沒有跟進它呼叫的那一層。

### 二、提示只有一格

```ts
const [draftNoticeState, setDraftNoticeState] =
  useState<{ sessionId: string; notice: IDraftNotice | null } | null>(null);
```

單一 `{sessionId, notice}` 槽位,兩間房不可能同時各有提示。
每次寫入都覆蓋前一個,回到原房時 `draftNoticeState.sessionId` 已經是別房的 id,
於是 `draftNotice` 算出 null —— 進度看起來像消失了。

## 治本

1. `runImportChapters` 接受呼叫端傳入的 `notify`(已釘住的版本),不自己碰 `setDraftNotice`。
   `runGapFillSections` 與 diagram 階段同樣要檢查。
2. `draftNoticeState` 改為 `Record<sessionId, IDraftNotice>`,比照 `pendingImportBySession`。
   `draftNotice` 由 `noticeBySession[activeSessionId] ?? null` 導出。

風險低,兩處都是本地狀態,不動 API 契約。

## 已做的止盲(2026-08-04,commit 924fde542)

- 提示帶 `startedAt`,元件每秒顯示已過時間 —— 會動的數字讓「還在跑」看得出來。
- 進度加報「N 章解析中」——「已完成 0/11」在開頭停留很久是正常的,單看完成數沒有資訊。
- 同一時間只允許一份匯入(`importInFlightRef` 記檔名),擋掉重複上傳並說出擋的是誰。

**這些不解決根因**:只讓「有在跑」看得出來,沒有修正「在哪一房看得到」。

## 驗收

- A 房匯入中切到 B 房:B 房不顯示 A 房的進度
- 切回 A 房:進度仍在,且數字持續前進
- A、B 兩房各自有匯入時,兩邊的提示互不覆蓋
