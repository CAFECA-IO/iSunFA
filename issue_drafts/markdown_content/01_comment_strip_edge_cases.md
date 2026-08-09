# [P2] MarkdownContent 註解剝除:行內 code span 與嵌套 fence 兩個漏網邊界

## 問題

20260730 的 fence-aware 修正(`src/lib/utils/markdown_comment.ts`,9 個測試)已擋住主要外溢,但 `stripMarkdownComments` 仍有兩條路徑會靜默改寫使用者的文件 —— 與原 bug 完全同一類,只是範圍更窄:

1. **行內 code span 不受保護**。`INLINE_COMMENT_PATTERN = /<!--.*?-->/g` 對整行做 replace,不看反引號。實測:
   - 輸入 `用 \`<!-- 註解 -->\` 標記` → 輸出 `用 \`\` 標記`
2. **fence 邊界只認「有沒有圍欄」,不追蹤字元種類與長度**。`FENCE_PATTERN = /^\s*(\`\`\`|~~~)/` 搭配 `inFence = !inFence`,任何一種圍欄都會 toggle 同一個 flag。實測:
   - 輸入 `~~~markdown` 區塊內嵌一組 ` ``` `,內層 toggle 把狀態翻掉,fence 內的 `<!-- A -->` 被吃掉
   - CommonMark 規範:關閉圍欄必須同字元、且長度 ≥ 開啟長度

`MarkdownContent` 是全站共用元件,命中面是任何貼 markdown / HTML 範例的頁面(寫教學文件、技術文檔必踩),不限碳盤查功能。原 bug 的核心風險論述在此完全適用:**我們靜默改寫了使用者的文件**。

縮排 fence(list 內的 3 空白圍欄)實測正常,無需改動。

## 實作辦法

1. **fence 狀態機記住開啟的圍欄**:以 `{ char: "\`" | "~", length: number }` 取代 boolean,只有「同字元且長度 ≥ 開啟長度」的行才關閉;不相符者視為 fence 內文原樣輸出。維持縮排 fence 現行行為。
2. **行內 code span 保護**:剝除前先以單次掃描切出反引號區段(支援多重反引號配對,如 `` ` `` 與 ` `` `),只對區段外套用 `INLINE_COMMENT_PATTERN`;跨行註解狀態機同樣要忽略 code span 內的 `<!--`,避免假觸發進入註解狀態把後續正文吃掉。
3. **不引入 markdown parser 依賴**。這是顯示層純函數,維持 O(n) 單次掃描與零外部依賴;`markdown_comment.ts` 的「純函數、呼叫端不得用它改寫要保存的內容」約束不變。

## 測試(補進 `src/__tests__/markdown_comment.test.ts`)

- 行內 code span 內的註解原樣保留;同一行 code span 外的錨點註解仍正確剝除
- `~~~` 內嵌 ` ``` `、` ``` ` 內嵌 `~~~`、4 反引號圍欄內含 3 反引號行
- 未閉合 fence 至 EOF:後續內容不被吃掉
- code span 內出現孤立 `<!--`(無 `-->`)不觸發跨行註解狀態
- 既有 9 個測試零 regression

## 驗收

- `npx jest src/__tests__/markdown_comment.test.ts` 全綠,新增案例覆蓋上述兩類
- 手動 UAT:在報告預覽貼一段含 HTML 註解範例的 markdown 教學內容,渲染輸出與原文一致
- 錨點註解(`carbon-data-table` / `carbon-chart` / `carbon-diagram`)仍正常隱藏,重算原地替換連動不受影響
- ESLint 零警告

## 依賴

無。與 issue 02(fence 註冊表)分屬不同檔案,可平行進行。
