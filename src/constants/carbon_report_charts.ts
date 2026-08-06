// Info: (20260720 - Tzuhan) 報告圖表模板白名單(#51):可用圖型 × 資料切面的決定性列舉
// Info: (20260720 - Tzuhan) LLM 只裁決「使用者要哪張圖、放哪段」(雙 enum 鎖死);
// Info: (20260720 - Tzuhan) 圖表數值一律由模板函式從 computedLedger 產出,LLM 零參與填值
// Info: (20260720 - Tzuhan) 註:TREND_LINE(期間趨勢)因單期 ledger 無時間序列刻意不上架 —
// Info: (20260720 - Tzuhan) 永不可滿足的模板即地雷;待多期資料模型(後續 issue)一併實作
export enum CarbonChartTemplateEnum {
  // Info: (20260720 - Tzuhan) 各範疇占比圓餅圖(mermaid pie)
  SCOPE_PIE = "SCOPE_PIE",
  // Info: (20260720 - Tzuhan) 各範疇長條圖(mermaid xychart-beta bar)
  SCOPE_BAR = "SCOPE_BAR",
  // Info: (20260720 - Tzuhan) 排放源明細表(markdown 表格,復用 #23 表格產生器)
  SOURCE_TABLE = "SOURCE_TABLE",
  // Info: (20260720 - Tzuhan) #53 碳流量桑基圖(mermaid sankey-beta):憑證 → 排放源 → Scope;
  // Info: (20260720 - Tzuhan) 總流入=總流出即質量守恆的視覺化(#22 同一哲學)
  EMISSION_SANKEY = "EMISSION_SANKEY",
  /**
   * Info: (20260803 - Tzuhan) 匯入報告的碳流量桑基圖:廠址 → 類別 → 排放形式(Issue C)。
   *
   * **刻意與 EMISSION_SANKEY 分開成兩個模板**,而不是在同一個模板裡分流:
   * 兩者的可信依據不同(一個是外部已查證的年度事實、一個是本系統可下鑽的帳本),
   * 共用錨點就只能存在一張,合併成一張則會讓查核者無法判斷任一條流量的來源。
   * 分開之後兩張圖可以並存,各自替換互不干擾。
   */
  IMPORTED_EMISSION_SANKEY = "IMPORTED_EMISSION_SANKEY",
  /**
   * Info: (20260806 - Tzuhan) 匯入報告的**排放去向**:全公司 → 廠址 → 前 N 大項目 + 其他。
   *
   * 與 IMPORTED_EMISSION_SANKEY(分類切面)拆成兩張,理由是**層與層必須是細分關係**。
   * 原本一張圖硬塞五層:組織 → 廠址 → 範疇 → ISO 類別 → 子代碼。
   * 但範疇 → ISO 類別 對類別一/二是 1:1(見 SCOPE_BY_ISO_SUBCATEGORY 的明表),
   * 而 1:1 的層在 sankey 上必然讓標籤互相重疊(mermaid 把標籤畫在節點右側)——
   * 那不是排版沒調好,是那兩層本來就重複。
   *
   * 拆開之後每張三層,橫向有空間;而「這份報告的排放去哪了」與「它怎麼分類的」
   * 本來就是兩個問題,查核者也是分開問的。
   */
  IMPORTED_TOP_ITEMS_SANKEY = "IMPORTED_TOP_ITEMS_SANKEY",
}

/**
 * Info: (20260806 - Tzuhan) 「前 N 大項目 + 其他」的 N。
 *
 * 取 9(加上「其他」剛好十個節點)。
 *
 * **為什麼用固定名額而不是相對門檻:** 名額給的是節點數的**上界**,
 * 而門檻(占總量 0.1%)給的是相對值 —— 項目一多,通過門檻的節點數就沒有上限,
 * 而項目很集中時又會濾掉太多。實測門檻還害過一次:
 * 台北分公司總量占 0.11% 高於門檻,但它每一個單項都低於門檻,整個廠址從圖上消失。
 *
 * 名額制的另一個好處是「其他」可以是**一個真的節點**:
 * 沒進前九名的流量仍然畫在圖上,總量因此守恆。門檻制只能把它們丟掉再列在圖下方。
 */
export const CARBON_SANKEY_TOP_ITEM_COUNT = 9;

// Info: (20260720 - Tzuhan) 桑基圖憑證節點上限:超過即略過憑證層(排放源→Scope),避免不可讀的毛線團
export const CARBON_SANKEY_MAX_EVIDENCE_NODES = 30;

/**
 * Info: (20260806 - Tzuhan) 桑基圖月別節點上限:超過即整層略過並明說。
 *
 * 取 24(兩個年度)。單一盤查年度最多 12 個月別節點,補列往年也還讀得出來;
 * 但若 ledger 橫跨數年,月別層會長成幾十個節點的柵欄,
 * 那時候該畫的是趨勢圖而不是在桑基圖上多一層 —— 兩張圖各有各的工作。
 *
 * **略過必須說出來。** 少一層而不講,讀者會以為這份帳本沒有日期。
 */
export const CARBON_SANKEY_MAX_MONTH_NODES = 24;

/**
 * Info: (20260803 - Tzuhan) 匯入桑基圖的節點上限。超過即降為兩層(廠址 → 類別),
 * 寧可少一層也不畫成毛線團 —— 沿用憑證層的同一條哲學。
 *
 * Info: (20260805 - Tzuhan) 改五層後上調至 90:第三層之後每個節點帶廠址前綴
 * (才是一棵真的樹,不然三個廠址共用類別節點會讓線互相交叉),
 * 節點數因此是乘出來的。實測這份報告在 0.1% 門檻下約 50 個節點。
 */
export const CARBON_SANKEY_MAX_IMPORTED_NODES = 90;

/**
 * Info: (20260805 - Tzuhan) 匯入桑基圖忽略的流量門檻:占全公司總量的比例。
 *
 * 五層圖的節點數是乘出來的(廠址 × 範疇 × 類別 × 子代碼),
 * 極細的流量在圖上只是一條看不見的線,卻照樣佔一個節點與一組標籤 ——
 * 標籤互相重疊之後,連看得見的流量也讀不出來了。
 *
 * 取 0.1%(這份報告約 8.3 公噸):濾掉 3.5 業務旅運(4.39)、總公司 1.1(0.44)等極細項,
 * 保留 3.3 員工通勤、類別四等看得見的流量。
 *
 * **被濾掉的一律列在圖下方。** 沒畫出來的東西必須說出來 ——
 * 只看圖會以為那些項目是零,而它們不是。
 */
export const CARBON_SANKEY_MIN_SHARE_OF_TOTAL = 0.001;

/**
 * Info: (20260807 - Tzuhan) 廠址小計清單的百分比:乘數與小數位。
 *
 * 分類圖抽掉廠址層之後,「哪個據點排最多」只剩這份清單交代 ——
 * 所以它要說得出比例,而不只是絕對值:8121.92 對外人不是資訊,97.5% 才是。
 *
 * 小數一位:三個廠址的占比是 2.4% / 0.1% / 97.5%,再多位數不增加判斷力,
 * 而 0.1% 這個量級需要一位才不會被四捨成 0%(那會讓一個真實據點看起來是零)。
 */
export const PERCENT_MULTIPLIER = 100;
export const SITE_SHARE_DECIMAL_PLACES = 1;

// Info: (20260721 - Tzuhan) UAT:排放總量匯總段(3.6)草稿生成時自動附掛碳流量桑基圖 —
// Info: (20260721 - Tzuhan) mermaid 原始碼落在 Markdown 輸入區,PDF 預覽區同步渲染
export const CARBON_AUTO_SANKEY_PARAGRAPH_ID = "ch3-6";

// Info: (20260720 - Tzuhan) 圖表區塊錨點(HTML 註解,渲染不可見):重算連動依此替換,敘述零改動
export const CARBON_CHART_ANCHOR_PREFIX = "carbon-chart";

export const buildChartAnchorStart = (
  templateId: CarbonChartTemplateEnum,
): string => `<!-- ${CARBON_CHART_ANCHOR_PREFIX}:${templateId}:start -->`;

export const buildChartAnchorEnd = (
  templateId: CarbonChartTemplateEnum,
): string => `<!-- ${CARBON_CHART_ANCHOR_PREFIX}:${templateId}:end -->`;
