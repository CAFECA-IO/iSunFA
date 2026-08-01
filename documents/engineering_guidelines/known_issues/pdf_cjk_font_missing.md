# 已知問題：列印環境缺少中文字型導致 PDF 中文變空心方框

**狀態**：**已解決**（2026-08-01，`R02-AIR_東京大學-羅浮宮` 驗證通過）。程式碼側有 `IS000022` fail fast，**維運側仍須在每台產出 PDF 的主機安裝字型**
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

### 關於「中文是 Type 3 點陣字」這個說法——是錯的

原 `LOGISTICS_PDF_CJK_IS_BITMAP` 註解記載「Chrome 在找不到可嵌入的中文字型時會把字符光柵化，這些字放大會模糊」。裝上字型後實測反駁了這個說法。

`R02-AIR` 報告含 52 個 Type 3 字型物件、217 個字形。逐一檢視 CharProcs：

| 檢查 | 結果 |
|---|---|
| 含影像運算子（`BI` / `ID` / `Do` / `/Image`） | **0** |
| 含路徑運算子（`m` / `l`） | **215** |
| 其餘 2 個 | 空白字（僅 `d1 227 0 0 0 0 0`，無繪製） |

**全部是向量輪廓，放大不會模糊。** 先前之所以判斷成點陣，是因為當時主機根本沒有中文字型，看到的 Type 3 是缺字狀態下的產物——那個狀態下的觀察不能推論字型正常時的行為。常數已更名為 `LOGISTICS_PDF_CJK_USES_TYPE3_VECTOR` 並改寫註解。

### 仍存在的代價：體積

Type 3 每個字型物件各自攜帶字形，沒有 CID 子集的共用與 hinting：

| 報告 | 總計 | 影像 | 非影像 |
|---|---|---|---|
| R01（當時中文無字形） | 197 KB | 141 KB | 56 KB |
| R02（中文正常） | 334 KB | 150 KB | **184 KB** |

中文字型的成本約 **128 KB**。成因推測是 `fonts-noto-cjk` 提供的是 `NotoSansCJK-Regular.ttc`（TrueType Collection），Skia 的 PDF 後端無法從 collection 產生 CID 子集，故改以 Type 3 逐字輸出輪廓。

若要收斂體積，可改安裝單一字族的檔案（如 Google Fonts 的 Noto Sans TC OTF/TTF）讓 Chrome 走正常的 CID 子集路徑。**不影響正確性**：文字可選取、可搜尋、放大清晰，對審計文件而言核心目標已達成。

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

判定比對的是**字形畫出來的樣子**，不是前進寬度（advance width）。

### 為何不能用寬度判定（第一版的錯誤）

第一版比對「中文字的寬度是否等於 U+FFFF 的寬度」。U+FFFF 是 Unicode 永久保留的 noncharacter，任何字型都不會為它提供字形，所以它量到的必然是該字型 `.notdef` 的寬度——這個推論沒錯，錯的是隱含假設：**「`.notdef` 的寬度會與真正的字形不同」**。

以實際字型檔量測（字級 100px）：

| 字型 | `M` | `測` | `U+FFFF` | 寬度判準 | 正確答案 |
|---|---|---|---|---|---|
| Noto Sans CJK | 81.2 | 100.0 | 100.0 | MISSING | **AVAILABLE** ❌ |
| DejaVu Sans | 83.3 | 60.0 | 60.0 | MISSING | MISSING ✅ |

CJK 字型的 `.notdef` 與真正的中文字**同為全角 1em**，寬度必然相同。所以寬度判準在兩種環境下都回 MISSING，只是在缺字時剛好答對。裝好字型後它反而把匯出全數擋掉（實測 `IS000022` 連續觸發，`latin: 81.19992` 正是 Noto Sans CJK 的指紋——其拉丁字源自 Source Sans，`M` 為 0.812em）。

改為點陣比對後同一組字型能正確分辨：

| 字型 | `測` 墨色像素 | `U+FFFF` 墨色像素 | 雜湊相同 | 判定 |
|---|---|---|---|---|
| Noto Sans CJK | 3663 | 3133 | 否 | AVAILABLE ✅ |
| DejaVu Sans | 1600 | 1600 | 是 | MISSING ✅ |

真正的「測」是筆畫複雜的表意文字，`.notdef` 是空白或一個方框，點陣不可能相同。

量測在瀏覽器內進行而非 Node 端讀 fontconfig，因為只有 Chrome 自己知道 per-character fallback 最後選了哪個字型 —— 系統有什麼字型與 Chrome 實際用了什麼字型可以不同。

## 後續（尚未處理）

**若要完全擺脫「主機必須裝字型」這個前提**，可將字型檔納入版控並於列印時子集化後內嵌：報告的中文字集很小（地點名稱加固定文案約數十字），子集後約數十 KB，輸出因此與作業系統無關、本機與 CI 與伺服器完全一致。代價是 repo 需固定放一份字型檔，並引入子集化工具（`pyftsubset` 或同等）。

在那之前，`IS000022` 保證的是**不會再靜默交付一份中文不可讀的報告**，但不保證報告一定能產出 —— 字型沒裝就是匯出失敗。這是刻意的取捨。
