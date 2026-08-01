# `chart_shell.tsx` wheel 監聽 ToDo 處理計劃

> ToDo: (20260721 - Luphia) 每個 ChartShell 實例各自綁 window wheel 監聽，多圖表報告頁會有 N 個 handler 同時觸發，考慮共用單一監聽或改綁 viewport
>
> 位置：`src/components/chart/chart_shell.tsx:74`

---

## 一、問題確認（已實測）

### N 個 handler 的來源

```
markdown_content.tsx  ── 逐個 code block 渲染 ──▶  <CustomChart>  ─┐
                                                                   ├─▶ <ChartShell> ─▶ window.addEventListener("wheel")
                                                └──────────────────▶  <MermaidChart> ─┘
```

`ChartShell` 只被 `custom_chart.tsx` 與 `mermaid_chart.tsx` 使用，而這兩者由 `markdown_content.tsx` 依 markdown 內的圖表標籤逐一渲染。**一份含 N 張圖表的報告 = N 個 ChartShell = N 個 window wheel 監聽。**

### 實際成本

`wheel` 是高頻事件（一次滾動可觸發數十次）。目前每次事件，N 個 handler 全部被呼叫，各自執行：

```typescript
const overViewport = viewportRef.current?.contains(e.target as Node);
const overModal = modalRef.current?.contains(e.target as Node);
```

即 **每次 wheel 事件 = N × 2 次 `Node.contains()` DOM 遍歷**，其中 N−1 個必定是白工。且因為註冊時帶 `{ passive: false }`，瀏覽器無法對這些監聽做捲動最佳化，即使絕大多數情況下 handler 根本不會 `preventDefault()`。

### 同檔其他監聽：無此問題

| 監聽 | 是否有 N 倍問題 | 說明 |
|---|---|---|
| `wheel`（第 89 行） | ✅ **有** | 無條件綁在 window |
| `keydown` ESC（第 102 行） | ❌ 無 | effect 開頭 `if (!isFullscreen) return;`，同時最多 1 個 |
| `useZoomPan` 的拖曳 | ❌ 無 | `dragHandlers` 是 React props 綁在元素上，無 window 監聽 |

實測全庫僅此一處 `addEventListener("wheel")`。

---

## 二、方案評估

### 方案 A（建議）：改綁 viewport / modal 元素

ToDo 自己提的第二個選項，也是成本與風險都最低的。

把監聽從 `window` 改綁到 `viewportRef.current`（一般模式）或 `modalRef.current`（全螢幕模式）。**由瀏覽器原生的 hit-testing 與事件冒泡決定派送對象**——游標在哪張圖表上，就只有那一張的 handler 被呼叫，其餘 N−1 個完全不會執行。

連帶好處：`contains()` 判斷可以整段刪除，因為「事件冒泡到這個元素」本身就等價於「游標在這個元素內」。

```typescript
// Info: (20260731 - Julian) Ctrl/⌘ + 滾輪縮放；全螢幕時於 modal 內直接滾輪縮放。
// Info: (20260731 - Julian) 監聽綁在 viewport / modal 元素本身而非 window：多圖表頁面下
// Info: (20260731 - Julian) 由瀏覽器 hit-testing 決定派送對象，只有游標所在的圖表會觸發，
// Info: (20260731 - Julian) 不再是 N 個 handler 同時跑，contains() 判斷也隨之省去。
useEffect(() => {
  const target = isFullscreen ? modalRef.current : viewportRef.current;
  if (!target) return undefined;

  const handleWheel = (e: WheelEvent) => {
    // Info: (20260731 - Julian) 一般模式需按住 Ctrl/⌘ 才縮放，避免蓋掉頁面正常捲動
    if (!isFullscreen && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale((prev) =>
      Math.max(minScale, Math.min(maxScale, prev + direction * wheelStep)),
    );
  };

  target.addEventListener("wheel", handleWheel, { passive: false });
  return () => target.removeEventListener("wheel", handleWheel);
}, [isFullscreen, setScale, minScale, maxScale, wheelStep]);
```

**⚠️ 關鍵陷阱（務必寫進註解，避免日後被「簡化」掉）**

不能改用 React 的 `onWheel` prop。React 17+ 在 root 上以 **passive** 方式註冊 `wheel`／`touchstart`／`touchmove`，在合成事件裡呼叫 `e.preventDefault()` 不會生效，只會在 console 噴警告，結果是 Ctrl + 滾輪照樣觸發瀏覽器頁面縮放。**必須維持原生 `addEventListener` + `{ passive: false }`。**

### 方案 B：共用單一 window 監聽（不建議）

ToDo 提的第一個選項。作法是建一個 module-level registry／Context，讓所有 ChartShell 註冊自己的 viewport，由單一 window 監聽做 hit-testing 後派送。

不建議的理由：

- 這等於**用 JS 重新實作瀏覽器本來就免費提供的事件派送**，hit-testing 邏輯要自己維護
- 需處理註冊／反註冊生命週期、全螢幕時的優先權、SSR 下 module 狀態殘留
- 效能上不會比方案 A 更好（方案 A 是 0 個多餘 handler，方案 B 是 1 個 handler + 自製 N 次比對）
- 新增跨元件共用狀態，違反目前 ChartShell「自我包含」的設計

**唯一適合 B 的情境**是需要「全域仲裁」（例如同時只允許一張圖表縮放、或要做跨圖表的手勢協調）。目前沒有這個需求。

---

## 三、行為對照（確認為等價重構，非行為變更）

| 情境 | 現況 | 方案 A | 一致 |
|---|---|---|---|
| 一般模式，游標在圖表上 + Ctrl/⌘ + 滾輪 | `overViewport && (ctrlKey \|\| metaKey)` → 縮放 | 事件冒泡至 viewport + Ctrl/⌘ → 縮放 | ✅ |
| 一般模式，游標在圖表上，未按 Ctrl/⌘ | 早退，頁面正常捲動 | 早退，頁面正常捲動 | ✅ |
| 一般模式，游標在圖表外 | `contains()` 為 false → 早退 | 事件不會派送到此監聽 | ✅ |
| 全螢幕，游標在 modal 內滾輪 | `overModal` → 縮放 | 綁在 modal，冒泡即觸發 | ✅ |
| 全螢幕，滾動被 backdrop 蓋住的原 viewport | 不可能觸發（`fixed inset-0` 覆蓋） | viewport 監聽已解綁 | ✅ |

一個實作細節：`modalRef` 只在 `isFullscreen === true` 時才掛載。effect 在 render 之後執行，因此 `modalRef.current` 屆時已有值；`isFullscreen` 在依賴陣列中，切換時會正確重新綁定。

---

## 四、執行狀態 — ✅ 已實作（方案 A）

1. ✅ 改寫 `chart_shell.tsx` 的 wheel `useEffect`：改綁 `viewportRef` / `modalRef`，移除兩處 `contains()` 判斷
2. ✅ 移除 `ToDo:` 標籤，替換為 JSDoc `Info:` 註解，載明「為何綁元素而非 window」與「為何不可改用 onWheel」
3. ✅ `npx tsc --noEmit` → 零新增型別錯誤
4. ✅ `npx eslint src/components/chart/chart_shell.tsx` → exit 0（effect 的 early return 已用 `return undefined` 滿足 `consistent-return`）
5. ✅ `npx prettier --check` → 格式符合
6. ⬜ 手動驗證（見下節，須在 Vercel preview 進行）

**改動範圍**：1 檔、1 個 useEffect。不觸及 API、i18n、型別定義或其他元件。
檔內 `window` 監聽現僅剩 ESC 的 `keydown`（本就有 `if (!isFullscreen) return` 早退，無 N 倍問題）。

---

## 五、驗證清單

自動化：

```bash
npx tsc --noEmit
npx eslint src/components/chart/chart_shell.tsx
```

手動（此為互動行為，無現成測試可覆蓋，須在 Vercel preview 走查）：

- [ ] **單圖表**：Ctrl/⌘ + 滾輪可縮放，且**未觸發瀏覽器頁面縮放**（驗證 `preventDefault` 仍生效，這是最容易被 passive 問題打到的一點）
- [ ] **單圖表**：不按 Ctrl/⌘ 滾輪時，頁面正常捲動、圖表不縮放
- [ ] **多圖表報告頁**：游標在第 2 張圖上 Ctrl + 滾輪，**只有第 2 張縮放**，其餘不受影響
- [ ] **全螢幕**：進入全螢幕後直接滾輪即可縮放（不需 Ctrl）
- [ ] **全螢幕進出**：反覆切換數次後縮放仍正常（驗證重新綁定與 cleanup 無洩漏）
- [ ] **卸載**：切換頁面／關閉圖表後，DevTools 的 Event Listeners 面板確認 wheel 監聽已移除

> 補充驗證方式：在多圖表頁面用 DevTools → Elements → Event Listeners 檢查 `window` 上的 `wheel` 監聽數量，改動前應為 N、改動後應為 0（全部改掛在各自的 viewport 元素上）。

---

## 六、建議提交方式

此改動與 PR #6570 的「直方圖工具」主題無關，且 #6570 目前已達 60 檔 +5088/−2298。建議**另開分支與 PR** 處理，commit 訊息如：

```
perf(chart): bind ChartShell wheel listener to viewport instead of window
```

若評估後仍要併入 #6570，因改動只有 1 檔 1 個 hunk，風險可控，但需在 PR description 補上說明。
