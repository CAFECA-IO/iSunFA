# 待匯入紀錄的保存有與 #12 同型的競態,且副作用寫在 state updater 裡

> **狀態**:📋 2026-08-07 開票,未排程

- 嚴重度:P2
- 檔案:`src/hooks/use_carbon_chat.ts`(`persistPendingImport`,約 2099–2163;呼叫點約 2450、2553)
- 關聯:#12(圖表重載後消失)—— 同一個失效模式的另一個實例

## 症狀

重試失敗章節後重新載入,補回來的章節又回到「還有 N 章失敗」。
偶發,開發模式下比正式環境容易出現。

## 成因

`persistPendingImport` 的版本處理與 #12 修正前完全同型:

```
const version = pendingImportVersionsRef.current.get(channel) ?? 0;
const nextVersion = await putPendingImportRecord(..., version, bookId);
pendingImportVersionsRef.current.set(channel, nextVersion);
```

讀取版本與回寫版本之間隔著一次網路往返,期間沒有任何 in-flight 保護。
兩次並發呼叫會讀到同一個起始版本,後到的那次撞上樂觀鎖。

失敗只有 `console.error`,不通知也不重試 —— 這是刻意的設計(不讓雲端保存失敗
毀掉記憶體裡的預覽),但也代表這個競態**在畫面上完全沒有痕跡**,
直到使用者重載才發現章節退回去了。

## 為什麼並發不是假設

2553 的呼叫點寫在 `setState` 的 updater 函式內:

```
setPendingImports((prev) => {
  ...
  void persistPendingImport(activeSessionId, next, ...);   // ← 副作用
  return { ...prev, [activeSessionId]: next };
});
```

React 要求 updater 是純函式。StrictMode 在開發模式下會**刻意呼叫 updater 兩次**
來逼出這類不純的實作,並發渲染下正式環境也可能重跑。
兩次呼叫拿到同一個 `pendingImportVersionsRef` 值 → 第二次必然 409。

原註解寫「寫在 updater 內是為了拿到剛合併好的結果 —— 從外面讀 state 會讀到合併前的值」,
這個顧慮是對的,但解法不對:合併結果應該在 updater 外算好,或用 ref 傳遞,
而不是把網路請求放進 updater。

諷刺的是這個呼叫點上方那行註解正是:
「補回來的章節也要落地,否則重載後又回到『還有 N 章失敗』」——
它承諾要防的症狀,正是這個競態會造成的症狀。

## 建議修法

1. 把 `persistPendingImport` 移出 updater:先用純函式算出 `next`,updater 只回傳新狀態,
   保存在 updater 之後(或 `useEffect` 內)觸發。
2. 加 in-flight 保護:同一 channel 已有請求在飛時,把新的保存合併成一次尾隨呼叫
   (與 #12 的作法一致,避免兩套不同的併發策略)。
3. 樂觀鎖衝突(409)不該只記 log:至少要重讀伺服器版本後重試一次,
   否則「不阻斷主流程」實際上等於「靜默丟資料」。

`saveInventoryState`(約 1439)是同一個模式,一併確認。

## 驗收

- 在 StrictMode 開發模式下重試失敗章節,重載後章節不退回。
- 加測試:對同一 channel 連續觸發兩次保存,第二次不得因版本衝突而丟失內容。
