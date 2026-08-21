// Info: (20260713 - Tzuhan) 碳盤查報告書標準章節大綱,共 11 章 33 段
// Info: (20260819 - Emily) 這份檔案的 guidance 是 **ISO 14064-1 版**,是目前的預設。
// Info: (20260819 - Emily) IFRS S1/S2 揭露版在 `carbon_report_outline_ifrs.ts`,節 id 一一對應。
// Info: (20260819 - Emily) 兩套並存不是二選一:ISO 14064-1 是盤查/查證標準,
// Info: (20260819 - Emily) IFRS S1/S2 是法規強制的揭露框架(金管會分梯適用),層次不同。
// Info: (20260819 - Emily) 08-18 的註解寫「錯位在 guidance,已逐條改為 ISO」—— 那句話的前提
// Info: (20260819 - Emily) 在 08-19 被推翻:33 節與老闆整理的原文一一對應,
// Info: (20260819 - Emily) 「聲明符合 IFRS S1/S2」是設計而不是缺陷。改動與理由見
// Info: (20260819 - Emily) `data/issue_drafts/open/54_report_framework_selection_and_compliance_claim.md`
// Info: (20260819 - Emily) (`open/44` 僅保留分類法接線那一半)。
// Info: (20260819 - Emily) title 是切節錨點(`buildSectionHeading`),兩套共用,不得因框架不同而改。
// Info: (20260818 - Emily) guidance 是注入 prompt 的東西 —— 它寫錯標準,產出的報告就宣告錯的標準。
// Info: (20260818 - Emily) 不變式測試在 `src/__tests__/carbon_report_outline.test.ts`,不要靠人眼複查。
// Info: (20260713 - Tzuhan) guidance 為各段落的撰寫目標,供 AI 引導對話時注入 prompt;isDataDriven 標記數據段落(數字必須來自後端決定論管線,LLM 只排版不算數)

/**
 * Info: (20260818 - Emily) 本報告對外承諾的標準 —— **唯一來源**
 * (2026-08-17 決議,見 `data/scratch/CARBON_LAUNCH_GATE.md` 第五節「對外先承諾 ISO 14064-1」)。
 *
 * ## 為什麼要一個常數
 *
 * 08-18 修 `open/44` 時只改了本檔的 guidance,而同一句宣告在系統裡有**三個地方**:
 *
 * 1. 本檔的 guidance(注入每一節的撰寫目標)
 * 2. `paragraph_draft.service.ts` 的角色句(注入**每一次**草稿呼叫,位置在 guidance 之上)
 * 3. `i18n/locales/<語系>/solutions.ts` 的 `iso_report_desc`(官網對外的產品說明,五個語系)
 *
 * 只改第 1 個的話,模型看到的是「這是一份 IFRS S1/S2 對齊的報告」+「請依 ISO 14064-1 寫」
 * 兩句互相矛盾的指示,而框架句在前;官網則繼續用 IFRS 的名義賣一份 ISO 的報告。
 *
 * 這正是這一週反覆出現的形狀:**兩邊各自自洽,中間對不上。**
 * i18n 那五份是純字串檔、拿不到常數,所以由測試把三端綁在一起
 * (`src/__tests__/carbon_report_outline.test.ts` 的「對外宣告的標準」那一組)。
 */
export const CARBON_REPORT_STANDARD = "ISO 14064-1";

/** Info: (20260818 - Emily) 查證準則(第九章與參考文獻引用);與上面同一個理由,一處寫死 */
export const CARBON_VERIFICATION_STANDARD = "ISO 14064-3";

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

// ToDo: (20260713 - Luphia) 章節 title 為硬編中文，將顯示於大綱導覽 UI；如需多語系報告請抽為 i18n key（guidance 屬注入 AI 的 prompt data，可留）
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

// ToDo: (20260713 - Luphia) 各段落 title 為硬編中文，將顯示於大綱導覽 UI；如需多語系報告請抽為 i18n key（同 CARBON_REPORT_CHAPTERS）
export const CARBON_REPORT_OUTLINE: ICarbonReportSection[] = [
  {
    id: "ch1-intro",
    chapterId: "ch1",
    code: "第一章",
    title: "組織與治理概況(導論)",
    guidance:
      "闡述組織進行溫室氣體盤查的目的、範圍與最高管理階層的承諾,並明確聲明「本報告書依據 ISO 14064-1:2018 編製」。符合性聲明是 ISO 14064-1 的必載項目,不得以其他準則名稱代替。",
    isDataDriven: false,
  },
  {
    id: "ch1-1",
    chapterId: "ch1",
    code: "1.1",
    title: "公司簡介與財務報告邊界",
    guidance:
      "填寫公司基礎營運資訊:法人名稱、營運據點、產業別、主要產品與活動,並說明本報告的報告組織範圍與其法人身分一致。",
    isDataDriven: false,
  },
  {
    id: "ch1-2",
    chapterId: "ch1",
    code: "1.2",
    title: "報告目的與主要使用者",
    guidance:
      "明確定義報告的目的與預期使用者:內部管理階層、第三方查證機構,以及依規定取得本報告的外部關係人,並說明報告的預期用途(供查證、供管理決策與減量規劃參考)。",
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
      "揭露溫室氣體盤查的責任與職權:最高管理階層如何監督(聽取報告的方式與頻率、如何納入決策),以及推行委員會或專責單位如何執行日常盤查作業與內部控管。",
    isDataDriven: false,
  },
  {
    id: "ch1-5",
    chapterId: "ch1",
    code: "1.5",
    title: "組織邊界設定方法",
    guidance:
      "依據 ISO 14064-1:2018,說明組織邊界所採用的合併方法(控制權法之財務控制或營運控制,或股權比例法),並逐一交代投資聯屬公司、合資企業的納入或排除。所選方法必須明示,且全報告一致採用。",
    isDataDriven: false,
  },
  {
    id: "ch1-6",
    chapterId: "ch1",
    code: "1.6",
    title: "報告涵蓋期間與重大財務連結",
    guidance:
      "明訂報告涵蓋的盤查期間(起訖日,通常為一個完整年度),並說明與前一年度盤查結果的銜接方式。",
    isDataDriven: false,
  },
  {
    id: "ch2-intro",
    chapterId: "ch2",
    code: "第二章",
    title: "報告邊界(導論)",
    guidance:
      "說明報告邊界的設定邏輯:組織邊界與報告邊界的關係、如何鑑別應納入的間接排放(含上游與下游),以及顯著性判定所依據的準則。",
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
      "跨越全價值鏈(包含上游供應鏈、營運本體、下游產品生命週期)進行系統化的排放源與移除量鑑別,並說明顯著性判定準則。經鑑別但未納入量化的排放源,必須逐項列出並敘明排除理由 —— ISO 14064-1 要求排除項與其理由可追溯,沉默的排除等於沒有盤查。",
    isDataDriven: false,
  },
  {
    id: "ch2-3",
    chapterId: "ch2",
    code: "2.3",
    title: "排放範疇與類別劃分",
    guidance:
      "依據 ISO 14064-1:2018 第 5.2.4 節,將排放源劃分為六大類別:類別一(直接溫室氣體排放與移除)、類別二(輸入能源之間接溫室氣體排放)、類別三(運輸之間接溫室氣體排放)、類別四(組織使用產品之間接溫室氣體排放)、類別五(使用組織產品之間接溫室氣體排放)、類別六(其他來源之間接溫室氣體排放)。照抄原文的類別與子類別代碼(如 1.1、2.1、3.1),不要改寫成其他準則的範疇制。",
    isDataDriven: false,
  },
  {
    id: "ch3-intro",
    chapterId: "ch3",
    code: "3.1",
    title: "溫室氣體排放量計算說明(含導論)",
    guidance:
      "說明本章排放量的量化基礎、涵蓋範圍與資料來源層級。列出完整排放源矩陣圖,盤點並確認所有活動均涵蓋京都議定書之七大溫室氣體(CO2, CH4, N2O, HFCs, PFCs, SF6, NF3)。",
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
      "說明核心計算算式,並依 ISO 14064-1:2018 載明所採用的全球暖化潛勢值(GWP)版本與來源(如 IPCC AR6),據以進行 CO2e 當量轉換。GWP 值與其來源是必載項目 —— 只寫「依 IPCC」而未指明版本不符合要求。",
    isDataDriven: false,
  },
  {
    id: "ch3-4",
    chapterId: "ch3",
    code: "3.4",
    title: "各類排放量計算細節與推理",
    guidance:
      "完整公開各類別(包含類別二的所在地基準與市場基準、類別三的上下游運輸、類別五的售出產品使用階段等)的算式邏輯與重大假設。生物源(生質碳)的排放與移除量必須與化石源分開列示,不得併入總量 —— 那是 ISO 14064-1 明訂要分列的一項。",
    isDataDriven: true,
  },
  {
    id: "ch3-5",
    chapterId: "ch3",
    code: "3.5",
    title: "量化方法與變更說明",
    guidance:
      "維持年度間的可比性,詳細說明本年度計算方法、排放係數或估算技術是否有變更、變更的原因,以及是否觸發基準年重新計算。",
    isDataDriven: false,
  },
  {
    id: "ch3-6",
    chapterId: "ch3",
    code: "3.6",
    title: "溫室氣體排放總量匯總表",
    guidance:
      "以結構化表格呈現絕對排放量(Absolute Emissions)與排放強度(Emissions Intensity,如每單位營收碳排、每噸產品碳排),並逐一分列類別一至類別六的排放量,以及七大溫室氣體(CO2、CH4、N2O、HFCs、PFCs、SF6、NF3)各自的公噸 CO2e。ISO 14064-1 要求逐一分列而不是只給總量;移除量(removals)若有,與排放量分列。",
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
      "定量評估:針對類別一與類別二等以實際量測為主的數據,計算統計學上的不確定性(提供 95% 信賴區間上限與下限),評估量測誤差。定性評估:針對類別三至類別六等高度依賴估算或外部第三方提供之數據,進行品質等級定性評分,並揭露估算方法的假設前提與重大不確定性來源。",
    isDataDriven: true,
  },
  {
    id: "ch5",
    chapterId: "ch5",
    code: "第五章",
    title: "溫室氣體減量措施及內部績效追蹤",
    guidance:
      "說明節約能源與溫室氣體排放的減量具體措施,以及內部績效追蹤的做法:原文列出的承諾事項、短期/中期/長期的減量或節能目標(照原文的數值與期程照實寫,例如年節電率),以及環境管理方案與後續環境監督與量測的安排。只寫原文有的,原文沒有的不要補也不要放佔位符。",
    isDataDriven: false,
  },
  {
    id: "ch6",
    chapterId: "ch6",
    code: "第六章",
    title: "溫室氣體資訊管理及盤查作業",
    guidance:
      "說明溫室氣體資訊的管理與盤查作業:年度盤查的時程與分工、數據蒐集與彙整的程序、內部覆核點,以及資訊系統如何確保數據的完整性與可追溯性。",
    isDataDriven: false,
  },
  {
    id: "ch7",
    chapterId: "ch7",
    code: "第七章",
    title: "溫室氣體內部查證及定期審查",
    guidance:
      "說明內部查證的安排:由誰執行、查核的範圍與抽樣方式、發現事項的處理與追蹤,以及管理階層定期審查盤查結果與改善措施的機制。",
    isDataDriven: false,
  },
  {
    id: "ch8",
    chapterId: "ch8",
    code: "第八章",
    title: "溫室氣體盤查資訊管理及記錄保存",
    guidance:
      "說明盤查資訊與紀錄如何與公司既有的文件管理及內部控制流程整合,並規範相關憑證(如水電費單據、生產報表、合約)的數位化與法定保存年限。",
    isDataDriven: false,
  },
  {
    id: "ch9-intro",
    chapterId: "ch9",
    code: "第九章",
    title: "查證(導論)",
    guidance:
      "說明為提高盤查資訊的可信度、並符合查證要求所安排的第三方獨立查證作業。",
    isDataDriven: false,
  },
  {
    id: "ch9-1",
    chapterId: "ch9",
    code: "9.1",
    title: "確信/查證範圍",
    guidance:
      "界定外部查證機構查驗的邊界,以及該邊界是否與本報告書的組織邊界及報告邊界完全重疊;若不重疊,逐項敘明差異。",
    isDataDriven: false,
  },
  {
    id: "ch9-2",
    chapterId: "ch9",
    code: "9.2",
    title: "確信/查證遵循準則",
    guidance:
      "寫明第三方機構執行查證時所遵循的準則(如 ISO 14064-3:2019 溫室氣體聲明之查證與確信、ISAE 3410 溫室氣體聲明之確信業務),並依原文照實填寫,不要預設。",
    isDataDriven: false,
  },
  {
    id: "ch9-3",
    chapterId: "ch9",
    code: "9.3",
    title: "實質性門檻",
    guidance:
      "界定外部查證容許的量化誤差門檻(如 5%),並說明定性重大性的判定標準 —— 哪些性質的錯誤、遺漏或分類錯置視為重大。",
    isDataDriven: false,
  },
  {
    id: "ch9-4",
    chapterId: "ch9",
    code: "9.4",
    title: "確信/查證保證等級",
    guidance:
      "明確載明保證等級與其理由。若不同類別採不同等級,逐一列明各類別對應的等級(合理保證 Reasonable Assurance / 有限保證 Limited Assurance)。不要預設任何等級 —— 依原文照實填寫,原文沒寫就不要編。",
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
      "說明本報告書的編排與呈現格式,以及與公司其他對外文件相互索引的方式,確保讀者可追溯到原始資料。",
    isDataDriven: false,
  },
  {
    id: "ch10-2",
    chapterId: "ch10",
    code: "10.2",
    title: "資訊公開與傳播途徑",
    guidance:
      "明列報告的公開途徑與取得管道(如公司官網、依規定公開之平台),以及利害關係人的諮詢窗口。",
    isDataDriven: false,
  },
  {
    id: "ch11",
    chapterId: "ch11",
    code: "第十一章",
    title: "參考文獻",
    guidance:
      "詳細條列編寫此報告所應用的準則與方法學(如 ISO 14064-1:2018 溫室氣體盤查與報告、ISO 14064-3:2019 溫室氣體聲明之查證與確信),以及各國政府或國際能源署(IEA)公告的電力排碳係數與產業統計參數庫,並註明版本與年度。",
    isDataDriven: false,
  },
];

export const CARBON_REPORT_SECTION_COUNT = CARBON_REPORT_OUTLINE.length;

// Info: (20260714 - Emily) 段落切分標題:`### {段落標題}`(標題含章節編號且全 33 段唯一,可作切分與錨點依據)
// Info: (20260714 - Emily) 移除舊 `SECTION NN:` 內部標記,不再滲入使用者可見的報告與 PDF
export const buildSectionHeadingByTitle = (title: string): string =>
  `### ${title}`;

export const buildSectionHeading = (section: ICarbonReportSection): string =>
  buildSectionHeadingByTitle(`${section.code} ${section.title}`);

// Info: (20260714 - Emily) 去除內文開頭殘留的 h3 標頭(相容舊格式草稿:content 曾內嵌 `### SECTION NN:` 標頭)
export const stripLeadingSectionHeading = (content: string): string =>
  content.replace(/^###[^\n]*\n+/, "").trim();
