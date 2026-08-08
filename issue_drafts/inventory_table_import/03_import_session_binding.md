# 匯入未綁定發起的會話:切換聊天室後套用會寫進錯的房間

> **狀態**:🟡 部分完成 2026-08-04 —— 階段一、二已做;**階段三(離開頁面仍存活)未做**,需 worker + Centrifugo。依據:`2026-08-04_retrospective.md`

**Labels**: bug, carbon, P1
**發現**: 2026-08-03,討論「切房是否中斷」時追程式碼發現,尚未實際觸發

---

## 這不是體驗問題,是資料歸屬問題

原本的提問是「匯入能不能在切換聊天室時不中斷」。追下去發現更前面的一件事:
**匯入根本沒有綁定發起它的會話。**

```ts
const [pendingImport, setPendingImport] = useState<IPendingImport | null>(null);
```

`pendingImport` 是單一全域狀態,而 `applyPendingImport` 寫入的是**按下套用當下**的
`activeSessionId`。匯入的 fetch 不理會 React,切房不會讓它停下來。所以:

> 在 A 房上傳報告 → 切到 B 房 → 匯入完成、預覽卡跳出 → 按套用 → **A 房的報告寫進 B 房**

而且 B 房原本的段落內容會被覆蓋、查核狀態被重置。使用者不會收到任何警告 ——
預覽卡看起來完全正常,因為它本來就不知道自己屬於哪一間。

同一個問題也影響 `applyImportedLedgerEntries`:帳本項目會寫進當下 channel 的
`inventoryStates`,於是 A 廠的排放資料出現在 B 房的桑基圖裡。

## 三個層次(建議分階段做)

### 階段一:綁定 + 拒絕(小,最先做)

`IPendingImport` 加 `originSessionId`(發起當下的 `activeSessionId`)。
`applyPendingImport` 開頭比對,不同即拒絕並提示「這份匯入屬於〈某某對話〉」。

- **不是讓它不中斷,是不讓它寫錯地方。** 這是正確性下限。
- 提示要指名道姓寫出來源對話,只說「無法套用」等於把問題丟回給使用者。

### 階段二:切房不中斷(中,體驗)

`pendingImport` 改為 per-session 的 map(鍵為 sessionId),切回原房即看見預覽卡。
匯入進度提示(`draftNotice`)同樣要 per-session,否則 B 房會看到 A 房的進度條。

需要一併處理:目前 `runImportChapters` 的 closure 捕獲 `activeSessionId`,
逐章結果寫進共用的 `results` 陣列——要改成把 sessionId 一路帶下去,不再依賴 closure。

### 階段三:離開頁面回來仍在(大,不在近期)

要把工作移出頁面生命週期:後端執行、Centrifugo 推進度、前端重連後續接。
這與 ADR 014 記的是同一件事——「真正的修正是結果不依賴這條連線存活」,
當初 nginx 逾時那條也是指向這裡。

## 為什麼今天不做

今天的目標是三層桑基圖,而階段二會牽動 `pendingImport` 的資料結構、預覽卡元件、
與匯入進度提示三處,足以吃掉剩餘時間。

**但階段一應該儘快做**——它防的是資料寫錯房間,而那種錯誤發生時沒有任何跡象。

## 驗收

- 階段一:A 房發起匯入 → 切 B 房 → 套用 → 被拒絕且提示指出來源對話;B 房內容不變
- 階段二:切回 A 房仍看得到預覽卡與進度;B 房不顯示 A 房的進度
