# 系統報表產出架構解析 (Sequence Diagrams)
> **Info**: (20260505 - Tzuhan)

以下是 iSunFA 系統內兩個產出財報與碳排查的關鍵模組序列圖。
---

## 1. 即時財報與儀表板模組 (Real-time Financial Report)
**觸發點**：使用者進入 `src/components/user/financial_report/*_view.tsx`
**特性**：每次進入頁面或調整日期時，即時向後端索取由「已核對傳票 (Verified)」即時運算出的報表數據。

```mermaid
sequenceDiagram
    actor User as 客戶 (Browser)
    participant UI as 財報 UI 元件<br/>(financial_report)
    participant API as Next.js API<br/>(/api/v1/.../report)
    participant DB as 資料庫 (Prisma)
    participant Engine as 核心報表引擎<br/>(src/lib/report/*)

    User->>UI: 進入財報頁面
    UI->>API: GET 要求報表資料 (帶入日期區間)
    
    Note over API, DB: 【重要】篩選條件：<br/>isVerified: true<br/>deletedAt: null
    API->>DB: 撈取範圍內的 Vouchers & ESG Records
    DB-->>API: 傳回明細資料
    
    API->>Engine: 傳遞資料給核心引擎<br/>(generateIncomeStatement 等)
    Note right of Engine: 依據借貸法則進行加總與抵銷
    Engine-->>API: 回傳 IIncomeStatement 等結構化 JSON
    
    API-->>UI: 回傳報表數據
    UI-->>User: 渲染華麗的視覺化圖表與報表
```

---

## 2. AI 深度分析與碳健檢模組 (AI Analysis Report)
**觸發點**：使用者在 `src/components/user/analysis/analysis_view.tsx` 選擇內部數據分析 (INTERNAL_CATEGORIES) 並付款生成。
**特性**：非即時，而是「快照 (Snapshot)」。將當下系統計算出的財報數字，送交給 Gemini 進行深度分析，並產出靜態報告。

```mermaid
sequenceDiagram
    actor User as 客戶 (Browser)
    participant UI as 分析產生器 UI<br/>(analysis_view)
    participant Service as 分析微服務<br/>(analysis.service.ts)
    participant DB as 資料庫 (Prisma)
    participant Engine as 核心報表引擎<br/>(src/lib/report/*)
    participant AI as AI 分析引擎<br/>(Gemini 2.5)

    User->>UI: 選擇分析項目並付款 (例：碳健檢)
    UI->>Service: 觸發 generateAnalysis()
    
    Note over Service, DB: 【重要】篩選條件：<br/>isVerified: true<br/>deletedAt: null
    Service->>DB: 撈取區間內的 Vouchers & ESG Records
    DB-->>Service: 傳回明細資料
    
    Service->>Engine: 傳遞資料給核心引擎<br/>(generateEsgReport 等)
    Engine-->>Service: 回傳精準的財務與碳排總表
    
    Note over Service, AI: 將引擎算出的數字，作為 Context 餵給 AI
    Service->>AI: 要求 AI 根據數據撰寫「健檢報告文字」
    AI-->>Service: 回傳 Markdown 分析報告
    
    Service->>DB: 將靜態報告存入歷史紀錄
    Service-->>UI: 通知產生完成
    UI-->>User: 在 History Tab 顯示靜態報告
```

---

### 架構洞察 (Architectural Insights)

從這兩張圖可以清楚看出：
這兩個看起來完全不同的功能，**在最深處都是依賴同一個「核心報表引擎 (src/lib/report/*)」** 來算出總和。

---

## 📌 文件維護指南 (When to Update)
這份文件定義了依賴報表引擎的雙軌架構，當發生以下情況時必須同步更新：
- **新增依賴模組**：若未來開發了如「批次匯出 PDF 報表微服務」或「即時財報警示系統」，需要將其 Sequence Diagram 補入此文件，以維持系統架構圖的完整性。
- **核心引擎抽離**：若 `src/lib/report/*` 未來被重構為獨立運行的跨語言微服務 (如 Golang/Rust)，必須更新此架構圖中的通訊協定與流程。
