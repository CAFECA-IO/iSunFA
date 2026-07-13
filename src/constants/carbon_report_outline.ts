// Info: (20260713 - Tzuhan) 碳盤查報告書標準章節大綱(IFRS S1/S2 對齊),共 11 章 33 段
// Info: (20260713 - Tzuhan) guidance 為各段落的撰寫目標,供 AI 引導對話時注入 prompt;isDataDriven 標記數據段落(數字必須來自後端決定論管線,LLM 只排版不算數)

export interface ICarbonReportChapter {
  id: string;
  title: string;
}

export interface ICarbonReportSection {
  id: string;
  chapterId: string;
  code: string;
  title: string;
  guidance: string;
  isDataDriven: boolean;
}

export const CARBON_REPORT_CHAPTERS: ICarbonReportChapter[] = [
  { id: "ch1", title: "第一章 組織與治理概況" },
  { id: "ch2", title: "第二章 報告邊界" },
  { id: "ch3", title: "第三章 溫室氣體排放" },
  { id: "ch4", title: "第四章 數據品質管理" },
  { id: "ch5", title: "第五章 溫室氣體減量措施及內部績效追蹤" },
  { id: "ch6", title: "第六章 溫室氣體資訊管理及盤查作業" },
  { id: "ch7", title: "第七章 溫室氣體內部查證及定期審查" },
  { id: "ch8", title: "第八章 溫室氣體盤查資訊管理及記錄保存" },
  { id: "ch9", title: "第九章 查證" },
  { id: "ch10", title: "第十章 報告之責任、目的與格式" },
  { id: "ch11", title: "第十一章 參考文獻" },
];

export const CARBON_REPORT_OUTLINE: ICarbonReportSection[] = [
  {
    id: "ch1-intro",
    chapterId: "ch1",
    code: "第一章",
    title: "組織與治理概況(導論)",
    guidance:
      "闡述組織如何將氣候變遷視為董事會層級的重大財務風險與機會,並聲明報告編寫符合 IFRS S1/S2 與相應量化標準。",
    isDataDriven: false,
  },
  {
    id: "ch1-1",
    chapterId: "ch1",
    code: "1.1",
    title: "公司簡介與財務報告邊界",
    guidance:
      "填寫公司基礎營運資訊,並說明與財務報表申報主體(Reporting Entity)的一致性。",
    isDataDriven: false,
  },
  {
    id: "ch1-2",
    chapterId: "ch1",
    code: "1.2",
    title: "報告目的與主要使用者",
    guidance:
      "明確定義報告旨在提供給股東、投資人與債權人等財務市場參與者,作為評估企業核心價值的依據。",
    isDataDriven: false,
  },
  {
    id: "ch1-3",
    chapterId: "ch1",
    code: "1.3",
    title: "氣候與永續政策聲明",
    guidance:
      "由最高管理階層(如董事長、執行長)簽署的永續承諾、淨零碳排路徑方針。",
    isDataDriven: false,
  },
  {
    id: "ch1-4",
    chapterId: "ch1",
    code: "1.4",
    title: "氣候治理架構與職責",
    guidance:
      "IFRS S2 核心:詳細揭露董事會對氣候風險的監督機制(如何聽取報告、頻率、納入決策),以及管理階層(如永續長、推行委員會)如何執行溫室氣體日常控管。",
    isDataDriven: false,
  },
  {
    id: "ch1-5",
    chapterId: "ch1",
    code: "1.5",
    title: "組織邊界設定方法",
    guidance:
      "依據 IFRS S2 規定,說明組織邊界如何與財務合併報表對齊(採用控制權法或股權比例法),並明確交代若有投資聯屬公司或合資企業時的範疇界定。",
    isDataDriven: false,
  },
  {
    id: "ch1-6",
    chapterId: "ch1",
    code: "1.6",
    title: "報告涵蓋期間與重大財務連結",
    guidance:
      "明訂報告時間必須與財務報表期間一致(通常為會計年度)。揭露資訊的發布必須與財務報告同步。",
    isDataDriven: false,
  },
  {
    id: "ch2-intro",
    chapterId: "ch2",
    code: "第二章",
    title: "報告邊界(導論)",
    guidance:
      "說明如何將氣候風險與商業策略結合,據以界定價值鏈中應納入盤查的重大碳排放項目。",
    isDataDriven: false,
  },
  {
    id: "ch2-1",
    chapterId: "ch2",
    code: "2.1",
    title: "基準年與歷史碳數據追蹤",
    guidance:
      "設定碳減量策略的比較基準年,並訂定嚴格的「基準年重新計算政策」(當公司發生實體併購、分拆或計算方法重大改變時,觸發基準年數據重算之門檻)。",
    isDataDriven: false,
  },
  {
    id: "ch2-2",
    chapterId: "ch2",
    code: "2.2",
    title: "溫室氣體排放源鑑別",
    guidance:
      "跨越全價值鏈(包含上游供應鏈、營運本體、下游產品生命週期)進行系統化排放源鑑別。",
    isDataDriven: false,
  },
  {
    id: "ch2-3",
    chapterId: "ch2",
    code: "2.3",
    title: "排放範疇與類別劃分",
    guidance:
      "IFRS S2 指標要求:依據 GHG Protocol 嚴格區分為範疇一(直接排放)、範疇二(能源間接排放)與範疇三(價值鏈間接排放,包含 15 項子類別)。",
    isDataDriven: false,
  },
  {
    id: "ch3-intro",
    chapterId: "ch3",
    code: "3.1",
    title: "溫室氣體排放量計算說明(含導論)",
    guidance:
      "聲明本章數據為企業氣候風險量化之基礎,用以評估碳定價或法規轉型帶來的潛在財務衝擊。列出完整排放源矩陣圖,盤點並確認所有活動均涵蓋京都議定書之七大溫室氣體(CO2, CH4, N2O, HFCs, PFCs, SF6, NF3)。",
    isDataDriven: false,
  },
  {
    id: "ch3-2",
    chapterId: "ch3",
    code: "3.2",
    title: "活動數據與排放係數選擇層級",
    guidance:
      "建立數據品質階層方針。說明原始數據(Primary Data,如電費單、採購發票)與推估數據的比例,並列出所引用的官方或國際權威排放係數庫。",
    isDataDriven: false,
  },
  {
    id: "ch3-3",
    chapterId: "ch3",
    code: "3.3",
    title: "量化方法學與 GWP 基礎",
    guidance:
      "說明核心計算算式,並載明遵循 IFRS S2 規定,統一採用 IPCC 最新公告之全球暖化潛勢值(GWP,如 AR6)進行 CO2e 的當量轉換。",
    isDataDriven: false,
  },
  {
    id: "ch3-4",
    chapterId: "ch3",
    code: "3.4",
    title: "各類排放量計算細節與推理",
    guidance:
      "完整公開各範疇(包含範疇二的所在地/市場基準、範疇三的供應鏈運輸、售出產品使用階段等)的算式邏輯、生質碳單獨報告說明及重大假設。",
    isDataDriven: true,
  },
  {
    id: "ch3-5",
    chapterId: "ch3",
    code: "3.5",
    title: "量化方法與變更說明",
    guidance:
      "維持 IFRS S1 的可比性原則,詳細說明本年度是否有任何計算方法、係數或估算技術的變更與背後原因。",
    isDataDriven: false,
  },
  {
    id: "ch3-6",
    chapterId: "ch3",
    code: "3.6",
    title: "溫室氣體排放總量匯總表",
    guidance:
      "以結構化表格呈現絕對排放量(Absolute Emissions)與碳排放強度(Emissions Intensity,如每單位營收碳排、每噸產品碳排),並明確區分範疇一、二、三之數據。",
    isDataDriven: true,
  },
  {
    id: "ch4-intro",
    chapterId: "ch4",
    code: "第四章",
    title: "數據品質管理(導論)",
    guidance: "說明如何將碳數據的內部控制納入公司整體的風險管理系統中。",
    isDataDriven: false,
  },
  {
    id: "ch4-1",
    chapterId: "ch4",
    code: "4.1",
    title: "溫室氣體內部控制與數據品質管理",
    guidance:
      "描述碳盤查資訊系統(如 ERP 或碳盤查系統)的控管流程、防呆與覆核機制,以及所有核心量測儀器(如內部電表、流量計)的校正維護紀錄。",
    isDataDriven: false,
  },
  {
    id: "ch4-2",
    chapterId: "ch4",
    code: "4.2",
    title: "估算不確定性與情境風險分析",
    guidance:
      "定量評估:針對範疇一與範疇二數據,計算統計學上的不確定性(提供 95% 信賴區間上限與下限),評估量測誤差。定性評估:針對範疇三等高度依賴估算或外部第三方提供之數據,進行品質等級定性評分,並揭露估算方法的假設前提與重大不確定性來源。",
    isDataDriven: true,
  },
  {
    id: "ch5",
    chapterId: "ch5",
    code: "第五章",
    title: "溫室氣體減量措施及內部績效追蹤",
    guidance:
      "轉型計畫(Transition Plan):說明公司如何透過營運優化或低碳投資來實現減碳,並說明所需的財務資源預算規劃。減量目標(Targets):揭露企業設定的氣候目標(如 2030 減碳 50%、2050 淨零),寫明是絕對目標或強度目標、是否通過科學基礎減量目標(SBTi)驗證、以及碳權(Carbon Offsets)預計使用的比例。",
    isDataDriven: false,
  },
  {
    id: "ch6",
    chapterId: "ch6",
    code: "第六章",
    title: "溫室氣體資訊管理及盤查作業",
    guidance:
      "說明企業如何鑑別實體風險(如極端氣候導致斷電、淹水)與轉型風險(如碳稅、低碳市場轉型),並說明如何將範疇三的價值鏈盤查結果作為減碳決策的依據。",
    isDataDriven: false,
  },
  {
    id: "ch7",
    chapterId: "ch7",
    code: "第七章",
    title: "溫室氣體內部查證及定期審查",
    guidance:
      "詳細揭露企業如何運用氣候情境分析(Climate Scenario Analysis)(例如在 1.5°C 或 2°C 以上的情境下)來測試企業商業模式與策略的彈性,並由管理階層定期審查因應。",
    isDataDriven: false,
  },
  {
    id: "ch8",
    chapterId: "ch8",
    code: "第八章",
    title: "溫室氣體盤查資訊管理及記錄保存",
    guidance:
      "說明碳管理如何與財務會計檔案、內部控制流程實質整合,並規範相關憑證(如水電費單據、生產報表、合約)的數位化與法定保存年限。",
    isDataDriven: false,
  },
  {
    id: "ch9-intro",
    chapterId: "ch9",
    code: "第九章",
    title: "查證(導論)",
    guidance:
      "說明為滿足財務市場與法規對於永續資訊「可信度」的要求,所安排的第三方獨立確信作業。",
    isDataDriven: false,
  },
  {
    id: "ch9-1",
    chapterId: "ch9",
    code: "9.1",
    title: "確信/查證範圍",
    guidance:
      "界定外部查證機構查驗的邊界,是否與本報告書及財務合併報表邊界完全重疊。",
    isDataDriven: false,
  },
  {
    id: "ch9-2",
    chapterId: "ch9",
    code: "9.2",
    title: "確信/查證遵循準則",
    guidance:
      "寫明第三方機構執行稽核時所遵循的國際通用的確信準則(如 ISAE 3410 溫室氣體聲明之確信業務、ISO 14064-3)。",
    isDataDriven: false,
  },
  {
    id: "ch9-3",
    chapterId: "ch9",
    code: "9.3",
    title: "實質性門檻",
    guidance:
      "界定外部查證容許的量化誤差門檻(如 5%),並揭露對財務投資人決策具有重大影響的「定性重大性」標準。",
    isDataDriven: false,
  },
  {
    id: "ch9-4",
    chapterId: "ch9",
    code: "9.4",
    title: "確信/查證保證等級",
    guidance:
      "明確載明確信級別。通常依照國際潮流或法規要求,範疇一、二採「合理確信(Reasonable Assurance)」,範疇三採「有限確信(Limited Assurance)」。",
    isDataDriven: false,
  },
  {
    id: "ch10-intro",
    chapterId: "ch10",
    code: "第十章",
    title: "報告之責任、目的與格式(導論)",
    guidance: "確立報告的法律揭露責任與跨平台發布形式。",
    isDataDriven: false,
  },
  {
    id: "ch10-1",
    chapterId: "ch10",
    code: "10.1",
    title: "財務報導之呈現格式",
    guidance:
      "說明本碳盤查報告如何與年報、永續報告或財務報告書進行跨內容的相互索引,確保資訊透明且便於投資人查閱。",
    isDataDriven: false,
  },
  {
    id: "ch10-2",
    chapterId: "ch10",
    code: "10.2",
    title: "資訊公開與傳播途徑",
    guidance:
      "明列報告在公開資訊觀測站、公司官網、或是提交至國際評比平台(如 CDP)的取得管道與利害關係人諮詢窗口。",
    isDataDriven: false,
  },
  {
    id: "ch11",
    chapterId: "ch11",
    code: "第十一章",
    title: "參考文獻",
    guidance:
      "詳細條列編寫此報告所應用的所有外部方法學(如 IFRS S2 準則文本、GHG Protocol 企業標準)、各國政府或國際能源署(IEA)公告的最新電力排碳係數與產業統計技術參數庫。",
    isDataDriven: false,
  },
];

export const CARBON_REPORT_SECTION_COUNT = CARBON_REPORT_OUTLINE.length;

// Info: (20260713 - Tzuhan) 產生段落在 Markdown 中的切分標題;與 use_carbon_chat 的 `### SECTION` 切分規則耦合,勿任意變更前綴
export const buildSectionHeadingByTitle = (
  title: string,
  index: number,
): string => `### SECTION ${String(index + 1).padStart(2, "0")}: ${title}`;

export const buildSectionHeading = (
  section: ICarbonReportSection,
  index: number,
): string =>
  buildSectionHeadingByTitle(`${section.code} ${section.title}`, index);
