# 自訂圖表 DSL 與 Markdown 攔截架構 (Custom Chart DSL & Markdown Interception)

> **Date**: 2026-07-17
> **Author**: Julian
> **Status**: Active (Phase 1 解析攔截 + Phase 2 四圖渲染與 ChartShell 統一外殼皆已完成)

---

## 1. 目的與範圍

為了支援 LLM 生成與使用者手動編輯的自訂圖表,系統在 Markdown 渲染流程中攔截四種自訂 fenced code block,將其原始字串安全解析為標準 JSON AST,供後續圖表元件渲染。

本階段(Phase 1)只實作**攔截 + 解析 + 錯誤/佔位外殼**;各圖表的實際繪製為 Phase 2。

支援類型(fence 語言即類型):`custom-matrix`、`custom-tornado`、`custom-histogram`、`custom-boxplot`。

## 2. 攔截流程

`src/components/common/markdown_content.tsx` 的 `code` component 是唯一攔截點(與既有 `mermaid` 攔截同處):

1. 語言標籤以 `/language-([\w-]+)/` 擷取(支援連字號,如 `custom-matrix`)。
2. `detectCustomChartType(lang)` 命中即渲染 `<CustomChart type raw />`,由該元件呼叫 `parseCustomChart` 解析。
3. 未命中則沿用原本的 mermaid / 一般 code 流程。

> 採 fenced code block(而非 HTML-like `<custom-*>` 標籤),因為專案未使用 `rehype-raw`,走 raw HTML 會額外開啟 XSS 面。

## 3. 共用語法 (Shared Grammar)

- fence 語言決定類型,body 內不需再寫 directive。
- `%%` 開頭為註解,整行忽略;空行忽略;每行前後空白皆 `trim`。
- **設定列**:`key: value`,`key` 屬該圖表白名單(小寫比對)。判定規則:冒號存在、且冒號位於第一個逗號之前、且 key 在白名單內;否則視為資料列。
- **資料列**:CSV(逗號分隔,支援雙引號包夾含逗號/引號的欄位),由共用的 `parseCsvLine`(`src/lib/utils/csv.ts`)解析。
- 數值:接受可選負號與小數。**解析器只萃取、不做任何計算或正規化**(不自動分箱、不自動算四分位)。

設定 key 一律定義於 `src/constants/custom_chart.ts` 的 `CustomChartConfigKey` enum(禁魔法字串)。

## 4. 各圖表格式與 AST

型別定義於 `src/interfaces/custom_chart.ts`。解析結果一律為判別聯集:

```ts
type ICustomChartParseResult =
  | { ok: true; ast: ICustomChartAst }
  | { ok: false; code: CustomChartParseErrorCode; message: string };
```

### 4.1 custom-matrix(重大性 / 四象限散佈)

設定:`title`、`xAxis`、`yAxis`(雙極,`min ↔ max`,左為 min 端右為 max 端;相容 `<->` 與 `↔️`)、`xScale`/`yScale`(選填數值)。
資料列:`label, x, y [, group]`。

```
title: 行動優先矩陣
xAxis: 低難度 ↔ 高難度
yAxis: 短期 ↔ 長期
導入碳盤查系統, 3, 8, 制度
```

AST:`{ type, title?, xAxis:{min?,max?,scale?}, yAxis:{min?,max?,scale?}, points:[{label,x,y,group?}] }`。無分隔符的軸文字歸為 `max` 端。

### 4.2 custom-tornado(成對雙數列 / butterfly)

顏色代表**兩個數列**(例如兩個年度),而非以基準值劃分高低;每列的左右長條各自從中心向外延伸。

設定:`title`、`unit`(皆選填)。
資料首列為**選填標題列**:`category, leftSeriesName, rightSeriesName`,由 parser **依欄位自動偵測**(首列第 2、3 欄皆非數字即視為標題列,提供數列名稱供圖例)。數列名稱須為非數字(用 `Prices (2019)`、`FY2019`、`2019年`,而非純 `2019`);**未填標題列則不顯示圖例**。
其餘資料列:`category, leftValue, rightValue`,`category`(標籤)**必填**,各值為該數列自身數值,不做任何計算。
AST:`{ type, title?, unit?, leftSeries?, rightSeries?, bars:[{category,left,right}] }`。
排序(依 `left+right` 遞減,最長者置頂呈龍捲風收斂外型)屬渲染層,AST 保留原始順序。

### 4.3 custom-histogram(已分箱)

設定:`title`、`xAxis`、`yAxis`(皆為字串標籤)、`trend`(選填,目前僅 `normal`)。資料列:`bin, count`。
`trend: normal` 會疊加平滑常態分佈曲線:渲染層以「分箱序號為 x、count 為權重」決定論計算加權平均/標準差,再依 count 尺度(峰值 = total∕(σ√2π))畫線;LLM 不計算、不捏造曲線值,僅適用有序數值分箱。
AST:`{ type, title?, xAxis?, yAxis?, trend?, bins:[{label,count}] }`。不支援原始數列自動分箱。

### 4.4 custom-boxplot(盒鬚圖,五數綜合)

設定:`title`、`yAxis`、`unit`。資料列:`label, min, q1, median, q3, max [, "outliers"]`(離群值選填,第 7 欄以 `;` 分隔並用引號包夾)。
AST:`{ type, title?, yAxis?, unit?, boxes:[{label,min,q1,median,q3,max,outliers?}] }`。不支援原始數列自動算四分位。

## 5. 防呆與錯誤處理

- `parseCustomChart` 為**純函式、決定論、不呼叫 LLM**;任何錯誤皆以 `{ ok:false, code, message }` 回傳,**對外永不 throw**,確保 render 走 fallback 而非整份 Markdown 崩潰。
- 錯誤碼:`EMPTY_CONTENT`、`NO_DATA_ROWS`、`MALFORMED_ROW`、`INVALID_NUMBER`、`SCHEMA_VALIDATION_FAILED`、`UNKNOWN_TYPE`。
- 結構驗證以 **Zod `safeParse`**(型別/必填/最小筆數)為第二道防線。
- 上限防呆:`MAX_INPUT_LENGTH`、`MAX_DATA_ROWS`,避免超大輸入。
- 領域不變量(如 box 的 `min ≤ q1 ≤ median ≤ q3 ≤ max`)**不在解析器強制**,遵循「解析器只解析、不計算/判斷」的原則,交由渲染或後續驗證層處理。

## 6. 相關檔案

| 檔案                                                  | 職責                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/constants/custom_chart.ts`                       | 類型 / 設定 key / 錯誤碼 / 分隔符 enum、const         |
| `src/interfaces/custom_chart.ts`                      | AST 與解析結果型別                                    |
| `src/lib/utils/csv.ts`                                | 共用 RFC 4180 CSV 單行解析                            |
| `src/lib/utils/custom_chart_parser.ts`                | `detectCustomChartType`、`parseCustomChart` 核心      |
| `src/components/chart/custom_chart.tsx`               | 攔截後的容器:解析 → 依 type 分派到各圖表元件          |
| `src/components/chart/chart_shell.tsx`                | 共用外殼:灰底 viewport、縮放/平移、提示、actions 插槽 |
| `src/components/chart/matrix_chart.tsx`               | matrix 渲染(純 SVG、雙極軸、象限底色、群組配色)       |
| `src/components/common/markdown_content.tsx`          | Markdown 攔截點                                       |
| `src/lib/utils/__tests__/custom_chart_parser.test.ts` | 決定論 + 防呆單元測試                                 |

## 7. 渲染與共用外殼進度

- **已完成**:`custom-matrix` 以 `matrix_chart.tsx` 渲染;所有自訂圖表包在共用外殼 `chart_shell.tsx`(灰底、Ctrl/⌘+滾輪縮放、拖曳平移、操作提示,與 `MermaidChart` 視覺一致)。
- **矩陣圖座標規則**:中性中心對齊繪圖區正中心——含負值以 `0` 為原點取對稱域,全非負則中心落在區間中點;十字軸通過中心。

## 8. Phase 2

- 四種自訂圖表(`custom-matrix`、`custom-tornado`、`custom-histogram`、`custom-boxplot`)渲染元件均已完成,皆包進 `ChartShell`。
- **共用外殼收斂(ChartShell 統一)已完成**:`ChartShell` 現為 Mermaid 與自訂圖表的唯一外殼,提供灰底容器、Ctrl/⌘ + 滾輪縮放、拖曳平移、全螢幕、下載選單(`useChartExport`)、操作提示與列印安全樣式;工具列以 `actions` 插槽承接 AI 助手等按鈕。
  - `ChartShell` props:`actions`(工具列插槽)、`exportFileName`(給值即啟用下載)、`enableFullscreen`、`fullscreenTitle`、`contentClassName`、`initialScale`/`minScale`/`maxScale`/`wheelStep`。
  - 匯出/列印以可縮放容器的 `.chart-shell-content` 為錨點;`pdf_tool.ts` 的 PDF 匯出樣式已改指向 `.chart-shell-*`。
  - `MermaidChart` 已改為把 SVG 以 `children` 放入 `ChartShell`,並用 `contentClassName="mermaid-container"` 讓 mermaid 專屬上色 CSS 生效、AI 按鈕經 `actions` 注入;pie 仍走 `DonutChart` 不進外殼。
  - **後續自訂圖表 AI 輔助工具**:直接在 `custom_chart.tsx` 對各 `ChartShell` 傳入 `actions`(AI 按鈕)即可,與 Mermaid 同一路徑。
  - 注意:全螢幕/匯出/列印/拖曳等互動需於本機瀏覽器驗證(型別檢查無法覆蓋)。
