// Info: (20260730 - Tzuhan) 結構圖模板白名單:不依賴 computedLedger 的圖,素材來自段落原文本身
// Info: (20260730 - Tzuhan) 動機:現行 4 張圖表模板全部由 computedLedger 產值,活動數據未進帳前整份報告一張圖都沒有。
// Info: (20260730 - Tzuhan) 但盤查報告的敘述章節本身就有大量結構性素材(治理架構、範疇類別對應、量化流程),
// Info: (20260730 - Tzuhan) 這些圖不需要任何數值,畫出來即可大幅提升可讀性與查核效率。
// Info: (20260730 - Tzuhan) 鐵律不變:LLM 只回「節點文字 + 父子關係」,mermaid 語法由模板組出,
// Info: (20260730 - Tzuhan) 且每個節點文字都必須能在該段原文中找到 —— 找不到就整張不畫(見 carbon_report_diagram.builder)。

export enum CarbonDiagramTemplateEnum {
  // Info: (20260730 - Tzuhan) 治理架構圖:主任委員 → 副主任委員 → 管理代表 → 執行秘書(上下層級)
  GOVERNANCE_TREE = "GOVERNANCE_TREE",
  // Info: (20260730 - Tzuhan) 範疇與類別對應圖:範疇一/二/三 → 類別 → 排放源(左右展開,層級較寬)
  SCOPE_CATEGORY_MAP = "SCOPE_CATEGORY_MAP",
  // Info: (20260730 - Tzuhan) 量化方法流程圖:活動數據 → 排放係數 → GWP → CO2e(線性鏈)
  QUANTIFICATION_FLOW = "QUANTIFICATION_FLOW",
  // Info: (20260730 - Tzuhan) 經營沿革時間軸:年月 → 里程碑事件(mermaid timeline,非 flowchart)
  MILESTONE_TIMELINE = "MILESTONE_TIMELINE",
  // Info: (20260730 - Tzuhan) 組織邊界圖:公司 → 各廠址/分公司(盤查範圍的視覺化)
  BOUNDARY_MAP = "BOUNDARY_MAP",
}

/**
 * Info: (20260730 - Tzuhan) 渲染型別。timeline 與 flowchart 對 parent 的語意不同:
 * - flowchart:parent 是「另一個節點」,必須存在於同批節點內,層級不得成環
 * - timeline:parent 是「時間標籤」(如 1966年01月),不需要自己也是節點;無層級可成環
 * 這個差異必須明示,否則會用樹的規則去驗證一條時間軸,把正確的輸入判成錯的。
 */
export enum CarbonDiagramRendererEnum {
  FLOWCHART = "flowchart",
  TIMELINE = "timeline",
}

export interface ICarbonDiagramTemplate {
  /** Info: (20260730 - Tzuhan) 該圖預設掛載的段落 id:一圖一段,避免同張圖散落多處各自演化 */
  paragraphId: string;
  /** Info: (20260730 - Tzuhan) 渲染型別:決定 mermaid 語法與 parent 的驗證規則 */
  renderer: CarbonDiagramRendererEnum;
  /** Info: (20260730 - Tzuhan) mermaid flowchart 方向:層級深的用 TD,層級寬的用 LR(timeline 不適用) */
  direction: "TD" | "LR";
  /** Info: (20260730 - Tzuhan) 節點數上限:超過即不畫(過密的圖等於沒有圖) */
  maxNodes: number;
}

/**
 * Info: (20260818 - Emily) 每個 `maxNodes` 從 08-18 起**不再是承重參數**
 * （`data/issue_drafts/open/48_diagram_silent_failure.md`）。
 *
 * 超過上限的處置由「整張圖消失」改成「退化成表格」,於是猜錯上限的後果
 * 從「資料在紙上消失」變成「換一種呈現」。這件事重要,因為這些值本來就猜不準:
 *
 * - `GOVERNANCE_TREE` 的 20 是 08-14 對著「那一次輸出 17 個節點」調的（原本 12）,
 *   而同一份原文兩趟給 **17 和 21** —— 第二趟就超了。
 * - `MILESTONE_TIMELINE` 的 40 是同一天對著「28 條里程碑」調的,
 *   而兩趟分別給 **67 和 62**。
 *
 * 把 20 改成 25、40 改成 70 只是把同一個問題推到下一次。
 * 所以這些值現在只回答一個問題:「畫成圖還讀得動嗎?」——
 * 答案是否的時候換表格,而不是把內容丟掉。
 */
export const CARBON_DIAGRAM_TEMPLATES: Record<
  CarbonDiagramTemplateEnum,
  ICarbonDiagramTemplate
> = {
  /**
   * Info: (20260814 - Emily) 上限從 12 放寬到 20
   * (`data/issue_drafts/open/34_diagram_overflow_clips_nodes.md`)。
   *
   * 實測高興昌那份的委員會是 1 個根 + 4 位幹部（主任委員、副主任委員、管理代表、
   * 執行秘書）+ 11 位部門委員 = **16 個節點**,而上限 12 讓它畫不完。
   *
   * 原本的 12 不是量測出來的,而配合舊 prompt「超過請只保留最上層與次層」的結果是:
   * 模型交回 12 個（根 + 4 幹部 + 7 個委員）、圖看起來完整,而**四個部門不見了** ——
   * 品管部、鋼管廠、冷軋廠、屏南廠。這正是本檔驗證器開頭那條理由要防的事
   * （少了成員的圖看起來是對的），只是刪減發生在驗證器之前,所以它沒機會攔。
   *
   * 20 是「16 再加餘裕」而不是拍出來的:委員會的規模由部門數決定,
   * 下一家公司多幾個部門是常態，多一倍不是。真的超過 20 就不畫並說明 ——
   * 那時「畫不下」是真的，而不是我們的上限太緊。
   */
  [CarbonDiagramTemplateEnum.GOVERNANCE_TREE]: {
    paragraphId: "ch1-4",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "TD",
    maxNodes: 20,
  },
  [CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP]: {
    paragraphId: "ch2-3",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "LR",
    maxNodes: 24,
  },
  [CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW]: {
    paragraphId: "ch3-3",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "LR",
    maxNodes: 10,
  },
  /**
   * Info: (20260730 - Tzuhan) 沿革條目多(實測那份有 23 個里程碑),上限放寬到 30;
   * Info: (20260730 - Tzuhan) 節點只存事件,年月放 parent(時間標籤),故節點數 = 事件數而非兩倍
   *
   * Info: (20260814 - Emily) 30 → 40。與 GOVERNANCE_TREE 同一個原因，但它是**回歸**：
   * 萃取 prompt 原本要求「超過上限請只保留最上層與次層」，模型會自己截到 30，表就畫出來。
   * 那條指示今天被移除（它讓驗證器看不到原文本來有幾個），於是模型照實回報 31 個
   * —— 而 31 > 30，那張沿革表就整張不畫了。
   *
   * 實測那份的沿革是 28 條里程碑（1966~2013），模型回 31 個節點。
   * 40 是「28 再加餘裕」：沿革長度由公司歷史長度決定，一家 60 年的公司多幾條是常態。
   *
   * 這也是為什麼上限一放寬就必須同時把 `CarbonDiagramNodesLlmOutputSchema` 的 60 放寬 ——
   * schema 的上限若只比這裡高一點，它會先攔到本該由 builder 說明的情況，
   * 而它攔下來的結果是 0 個節點，訊息就變成「素材不足」，與事實相反。
   */
  [CarbonDiagramTemplateEnum.MILESTONE_TIMELINE]: {
    paragraphId: "ch1-1",
    renderer: CarbonDiagramRendererEnum.TIMELINE,
    direction: "TD",
    maxNodes: 40,
  },
  [CarbonDiagramTemplateEnum.BOUNDARY_MAP]: {
    paragraphId: "ch1-5",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "TD",
    maxNodes: 12,
  },
};

// Info: (20260730 - Tzuhan) 結構圖區塊錨點(HTML 註解,渲染不可見):與數據圖表分開命名空間,重建互不干擾
export const CARBON_DIAGRAM_ANCHOR_PREFIX = "carbon-diagram";

export const buildDiagramAnchorStart = (
  templateId: CarbonDiagramTemplateEnum,
): string => `<!-- ${CARBON_DIAGRAM_ANCHOR_PREFIX}:${templateId}:start -->`;

export const buildDiagramAnchorEnd = (
  templateId: CarbonDiagramTemplateEnum,
): string => `<!-- ${CARBON_DIAGRAM_ANCHOR_PREFIX}:${templateId}:end -->`;

/**
 * Info: (20260730 - Tzuhan) 節點文字長度上限:過長的節點會把 mermaid 圖撐爛。
 *
 * Info: (20260806 - Tzuhan) 40 → 60。
 *
 * 40 是憑感覺定的,而實測擋掉的是原文的一個**完整里程碑**:
 * 「永安廠冷軋產品榮獲 ISO 9001、ISO 14001 及 OHSAS 18001 認證」(43 字)——
 * 那不是「模型把整段敘述塞進節點」,它就是原文那一條。
 * 一整段敘述通常上百字,60 仍然擋得住。
 */
export const CARBON_DIAGRAM_MAX_LABEL_CHARS = 60;

/**
 * Info: (20260806 - Tzuhan) 超長節點占比的上限:超過即整張不畫。
 *
 * 這道界守的是原規則的**本意** —— 「模型把整段敘述當成節點」。
 * 那種情形的特徵是**大部分**節點都過長,而不是三十個裡有一個。
 * 半數以上過長即不採信;否則只略過那幾個(見 validateDiagramNodes)。
 */
export const CARBON_DIAGRAM_MAX_OVERLONG_SHARE = 0.5;

/**
 * Info: (20260730 - Tzuhan) 時間軸最少需要幾個「有時間標籤」的事件。
 * 實測:1.1 節被 gap-fill 改寫成公司簡介後已無沿革條目,模型只抓到「2023年底 : 員工人數約為217人」
 * 這一個點,還把時間標籤本身當成事件節點 —— 產出一張技術上合法、語意上無意義的時間軸。
 * 護欄擋不住語意荒謬,但擋得住「一個點的時間軸」:少於此數即不畫。
 */
export const CARBON_TIMELINE_MIN_DATED_EVENTS = 3;

/**
 * Info: (20260804 - Tzuhan) flowchart 的節點下限(issue_drafts/inventory_table_import/05)。
 *
 * 實測畫出過只有一個節點的治理架構圖(只有「溫室氣體盤查推行委員會」)、
 * 只有兩個節點的範疇對應圖。**單節點的圖比沒有圖更糟** ——
 * 它看起來像在陳述「這個組織的治理架構只有一個委員會」,而那是錯的訊息;
 * 沒有圖至少不會誤導,說明文字還能指出是原文該節資訊不足。
 *
 * 三個節點是「能構成關係」的最小值:兩個節點只畫得出一條邊,
 * 那用一句話講完即可,不需要一張圖。與 timeline 的下限同一個理由。
 */
export const CARBON_DIAGRAM_MIN_NODES = 3;

/**
 * Info: (20260812 - Emily) 里程碑表的兩個表頭 —— **唯一來源**。
 *
 * 這兩個字串原本各自寫死在三個地方:產生器的預設 labels、產生器的 `?? "時間"`
 * fallback、以及讀取端 `markdown_timeline_table` 的轉換。三份副本靠註解
 * 「與 CARBON_DIAGRAM_DEFAULT_LABELS 一致」維持,而它們是**同一份契約的兩端**:
 * 產生器寫出表頭、讀取端把既有草稿的 timeline 轉成同樣的表頭。
 *
 * 產生器端原本還允許用 labels 覆寫這兩個值,那會讓同一份報告出現兩種表頭 ——
 * 讀取端是純文字轉換,拿不到 labels,不可能跟著改。已移除那兩個覆寫欄位:
 * **一個無法在兩端同時兌現的選項,不該提供。** 日後真要 i18n,兩端都得吃同一組。
 */
/**
 * Info: (20260818 - Emily) 結構退化表的三個表頭 —— 唯一來源
 * （`data/issue_drafts/open/48_diagram_silent_failure.md`）。
 *
 * 與 `MILESTONE_TABLE_HEADERS` 同一個理由:表頭散進多處會分岔,
 * 而讀取端的純文字轉換拿不到 labels,不可能跟著改。所以不提供覆寫。
 */
/**
 * Info: (20260818 - Emily) 「超過上限」說明文字裡的兩個關鍵片語 —— **唯一來源**。
 *
 * 這份契約有兩端:產生端是 `CARBON_DIAGRAM_DEFAULT_LABELS.tooMany`,
 * 讀取端是驗收腳本 `scripts/uat_carbon_report.ts` —— 它要從 PDF 的文字層分辨
 * 「退化成表格了」與「整張圖不見了」。
 *
 * 抽成常數而不是讓兩端各寫一份正規表示式:片語改了而腳本照舊回報 ✓,
 * 是這一週被 review 擋下三次的同一個形狀 ——
 * **驗證的對象要在程式的輸入空間裡,不要在論證裡。**
 * 一支會說謊的驗收腳本比沒有驗收腳本更糟。
 */
export const DIAGRAM_CAP_EXCEEDED_PHRASE = "超過本圖的繪製上限";

export const DIAGRAM_DEGRADED_TO_TABLE_PHRASE = "改以表格呈現";

/**
 * Info: (20260818 - Emily) 退化表裡「這一格原本就沒有值」的內容:
 * 根節點沒有上層項目、補在表尾的節點沒有層級。
 *
 * **不能是空字串** —— 與 `MILESTONE_EMPTY_EVENT` 同一個陷阱:
 * 空儲存格會讓那一列變成「第一格有內容、其餘皆空」,而 `carbon_report_html` 的
 * `isGroupRow` 正是這個判準,於是一個資料點會被渲染成橫跨整表的章節標題。
 * 破折號讓它留在資料列的形狀裡,同時誠實表達那一格沒有值。
 */
export const HIERARCHY_NO_VALUE = "—";

export const HIERARCHY_TABLE_HEADERS = {
  level: "層級",
  item: "項目",
  parent: "上層項目",
} as const;

export const MILESTONE_TABLE_HEADERS = {
  period: "時間",
  event: "事件",
} as const;

/**
 * Info: (20260812 - Emily) 「只有時間、沒有事件」那一列的事件欄內容。
 *
 * **不能是空字串。** 留空的話這一列與 `section` 產生的列形狀完全相同
 * (第一格有內容、其餘皆空),而 `carbon_report_html` 的 `isGroupRow` 正是這個判準 ——
 * 於是它被渲染成橫跨整表的章節分隔列,**一個資料點被畫成一個章節標題**。
 * 破折號讓它留在資料列的形狀裡,同時誠實表達「原文這一項只有時間、沒有事件」。
 *
 * 與 `MILESTONE_TABLE_HEADERS` 放在一起的理由相同:它是里程碑表**形狀契約**的一部分,
 * 而那份契約有產生端與讀取端兩邊。放在讀取端的檔案裡等於再種一顆會分岔的副本。
 */
export const MILESTONE_EMPTY_EVENT = "—";
