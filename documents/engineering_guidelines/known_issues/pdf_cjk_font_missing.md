# 已知問題：列印環境缺少中文字型導致 PDF 中文變空心方框

**狀態**：程式碼側已加防呆（IS000022 fail fast），**維運側需在每台產出 PDF 的主機安裝字型**
**發現於**：2026-08-01，測試環境 `R01-AIR_台北市政府-曼徹斯特博物館_air_multimodal.pdf`
**影響範圍**：物流碳足跡報告（`logistics_report_pdf.service.ts`）、數位產品護照（`dpp.service.ts`）

---

## 症狀

PDF 內所有中文字渲染為空心方框：

- 「台北市政府」→ □□□□□
- 「曼徹斯特博物館」→ □□□□□□□
- 「方案總排放」「段數」「逐段路徑圖」→ 全數方框

而匯出流程**回報成功**，使用者拿到的是一份地點名稱不可讀的檔案。對審計文件而言這不是品質瑕疵而是不可用。

## 診斷方式

```bash
pdffonts <報告>.pdf
```

異常時只會列出 DejaVu 家族、且**沒有任何 CJK 字型或 Type 3 字型**：

```
AAAAAA+DejaVuSansMono-Bold   CID TrueType  Identity-H  yes yes yes
BAAAAA+DejaVuSans-Bold       CID TrueType  Identity-H  yes yes yes
CAAAAA+DejaVuSans            CID TrueType  Identity-H  yes yes yes
```

在主機上確認字型狀態：

```bash
fc-list :lang=zh family | sort -u
fc-match "Noto Sans CJK TC"
fc-match sans-serif
```

事故當時的實際輸出：

```
Fixed                                          ← 只有 X11 點陣字
---
DejaVuSans.ttf: "DejaVu Sans" "Book"           ← Noto CJK 未安裝
DejaVuSans.ttf: "DejaVu Sans" "Book"
```

## 根因

**兩層，缺一不可。**

1. **CSS 家族名寫的是網頁名而非系統名。** 原字型堆疊寫 `"Noto Sans TC"`，那是 Google Fonts 的網頁名稱；Linux 上 `fonts-noto-cjk` 安裝出來的家族名是 `"Noto Sans CJK TC"`，兩者是不同字串，不會互相匹配。已於 `src/constants/pdf_font.ts` 修正，涵蓋各平台真實家族名。

2. **主機根本沒有安裝任何真正的 CJK 字型。** 這是主因，改 CSS 無法解決。Chrome 對缺字的字元一律使用 `.notdef`，DejaVu 的 `.notdef` 就是空心方框。

`dpp.service.ts` 的字型堆疊原本連一個 CJK 家族都沒有（`'Inter', -apple-system, sans-serif`），卻在頁尾寫死中文「用人工智能重塑碳會計」，屬於同一問題的第二個現場。

### 為何舊註解說中文是 Type 3 點陣字

`LOGISTICS_PDF_CJK_IS_BITMAP` 的註解記載「19 個相異中文字各自成為一個 Type 3 字型物件」。那是 Chrome fallback 到 `Fixed`（X11 misc-fixed 點陣字）的結果 —— 該字型宣稱支援 `:lang=zh`，但只有點陣字形。

也就是說這個問題**退化過兩次**：先從「有可嵌入的中文字型」退到「只有點陣字（字會模糊）」，再退到「連點陣字都沒被選用（字不存在）」。這正是把字型當成環境隱含前提的下場。

## 修法

### 維運（必要）

Debian / Ubuntu：

```bash
sudo apt-get update && sudo apt-get install -y fonts-noto-cjk
fc-cache -fv
pm2 restart isunfa        # Chrome 啟動時才讀 fontconfig 快取，必須重啟
```

驗證：

```bash
fc-match "Noto Sans CJK TC"   # 應回 NotoSansCJK-Regular.ttc
```

之後重新匯出一份含中文地點的報告，以 `pdffonts` 確認出現 `NotoSansCJK` 且無 Type 3。

### 程式碼（已完成）

- `src/constants/pdf_font.ts` — 共用字型堆疊，涵蓋各平台真實家族名；家族名以單引號包覆，因為堆疊會被嵌進 `style="..."` 行內屬性，雙引號會提前結束屬性值
- `src/lib/utils/pdf_font_probe.ts` — 覆蓋率判定（純函數、有測試）
- `logistics_report_pdf.service.ts` — 列印前以 canvas `measureText` 比對中文字與 U+FFFF 的寬度；相等即代表中文落在 `.notdef` 上，此時若報告含中文即 throw `IS_PDF_FONT_UNAVAILABLE`

判定不使用門檻值：門檻值換一次字型就失效。U+FFFF 是 Unicode 永久保留的 noncharacter，任何字型都不會為它提供字形，所以它量到的一定是該字型 `.notdef` 的寬度。

量測在瀏覽器內進行而非 Node 端讀 fontconfig，因為只有 Chrome 自己知道 per-character fallback 最後選了哪個字型 —— 系統有什麼字型與 Chrome 實際用了什麼字型可以不同。

## 後續（尚未處理）

**若要完全擺脫「主機必須裝字型」這個前提**，可將字型檔納入版控並於列印時子集化後內嵌：報告的中文字集很小（地點名稱加固定文案約數十字），子集後約數十 KB，輸出因此與作業系統無關、本機與 CI 與伺服器完全一致。代價是 repo 需固定放一份字型檔，並引入子集化工具（`pyftsubset` 或同等）。

在那之前，`IS000022` 保證的是**不會再靜默交付一份中文不可讀的報告**，但不保證報告一定能產出 —— 字型沒裝就是匯出失敗。這是刻意的取捨。
