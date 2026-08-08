# [P3] MarkdownContent fence 註冊表:切斷通用元件對功能模組的反向依賴

## 問題

`src/components/common/markdown_content.tsx:10-13` 在編譯期 import 功能模組的常數:

```ts
import {
  CARBON_EVIDENCE_FENCE_LANG,
  parseEvidenceFence,
} from "@/constants/carbon_evidence";
```

依賴方向是反的 —— **通用元件不該知道功能模組**。目前實際影響小(常數檔很輕,`EvidenceChain` 已用 `dynamic(..., { ssr: false })` 動態載入,一般渲染不受拖累),所以不值得卡住 esg_report_ingestion 那個 PR;但這是**模式問題**:每加一種 fence 語言就在通用元件裡多一條 `if` 與一條跨模組 import。現況已有 `carbon-evidence`、`mermaid`、custom chart 三條分支(`markdown_content.tsx:337`、`:344` 等),`markdown_content.tsx` 正在長成所有功能模組的匯流點。

## 實作辦法

1. **建 `src/lib/markdown/fence_registry.ts`**:
   - 型別 `FenceRenderer<T> { lang: string; parse(text: string): T | null; render(parsed: T): ReactNode }`,嚴禁 `any`(未知輸入用 `unknown` + type guard)
   - `registerFence(renderer)` / `resolveFence(lang): FenceRenderer | undefined`,內部為 `Map<string, FenceRenderer>`,resolve 為純查表
2. **`markdown_content.tsx` 的 `code` component 改為**:取 `fenceLang` → `resolveFence(lang)` → 命中且 `parse` 回傳非 null 才 `render`,否則退回一般 code block(完整保留現行「格式不符退回一般程式碼區塊呈現」語意)。移除 `@/constants/carbon_evidence` import。
3. **功能模組自行註冊**:carbon 側在 `src/components/carbon_chatbot/` 註冊 `carbon-evidence`,renderer 內部維持 dynamic import `EvidenceChain`(不拖累一般渲染的特性必須保住)。註冊時機要保證在首次渲染前完成(app provider 或模組 barrel 匯入),避免 race 導致 fence 退回 code block。
4. **分階段遷移**:先讓 `carbon-evidence` 走通 registry,再評估 `mermaid` / custom chart(這兩者有 `onChartChange` 等回呼,需先確認 renderer 介面是否要支援 props 透傳)。
5. fence 語言字串一律留在 `src/constants/`(拒絕魔法字串鐵律),不得散落於 renderer 實作。

## 驗收

- `git grep "constants/carbon_evidence" src/components/common/` 零結果
- `carbon-evidence` 行為不變:合法 payload → `EvidenceChain`;格式不符 → 一般 code block;`src/__tests__/carbon_evidence.test.ts` 全綠
- registry 單元測試:未註冊語言零影響、重複註冊行為明確(覆蓋或 throw,擇一並記錄)、resolve 無副作用
- 一般 markdown 渲染的 bundle 無新增同步依賴(動態載入仍生效)
- ESLint 零警告;架構決策同步記錄至 `documents/architecture/`

## 依賴

無,可獨立於 esg_report_ingestion PR 之後執行。與 issue 01 不同檔案,衝突面小。
