import { GUIDE_FIGURE_ID } from "@/constants/logistics_guide";

export const transportationCarbonFootprintCalculator = {
  title: "物流碳足跡",
  default_ai_input: "從臺北國父紀念館運送 5000 公斤的石板到曼徹斯特博物館",
  analysis_failed: "分析失敗",
  error: {
    missing_input: "請輸入運輸路線描述，或展開進階設定手動輸入完整參數。",
    ai_parse_failed: "AI 解析失敗",
    missing_params: "無法取得完整參數，請確認 AI 解析結果或手動輸入。",
  },
  payment: {
    fee_name: "碳足跡分析費用",
    modal_label: "物流碳足跡分析",
    modal_value: "物流分析",
  },
  pdf: {
    generating_title: "正在生成高畫質 PDF...",
    generating_desc: "這可能需要幾秒鐘的時間，請稍候",
    generating_title_large: "正在為您產生高畫質 PDF 報告",
    generating_desc_large_1: "系統正在擷取地圖路線與詳細分析數據...",
    generating_desc_large_2:
      "由於包含高畫質渲染內容，這可能需要幾秒鐘的時間，請稍候片刻。",
    error_failed: "生成 PDF 失敗，錯誤訊息：",
    error_unknown: "未知錯誤",
    mode_land: "純陸運",
    mode_sea: "海運多式聯運",
    mode_air: "空運多式聯運",
    origin: "起點",
    dest: "終點",
    footer: "頁碼 {{current}} / {{total}} • 路線：{{origin}} ➝ {{dest}}",
    section_analysis: "專屬區段分析",
    weight_label: "總重: {{weight}} KG",
    watermark: "iSunFA CONFIDENTIAL",
    export_id_label: "匯出批次",
    plan_code_label: "方案代碼",
  },
  ui: {
    title: "物流碳足跡",
    description:
      "透過 AI 智能分析運輸路線，自動分割陸運、海運與空運路段，並依據 IPCC 基準估算各區段里程與碳排放量。",
    not_generated: "分析報告尚未生成",
    config_title: "參數配置與分析控制",
    route_description: "運輸路線描述",
    route_placeholder: "例如：從台北市運送貨物到美國紐約",
    advanced_config: "進階參數手動配置 (可選)",
    origin_lat: "起點緯度",
    origin_lng: "起點經度",
    dest_lat: "終點緯度",
    dest_lng: "終點經度",
    total_weight: "總重 (KG)",
    land_route: "純陸運方案",
    sea_route: "海運多式聯運",
    air_route: "空運多式聯運",
    exporting: "匯出中...",
    export_report: "匯出報告",
    calculating: "運算中...",
    generate_report: "產生分析報告",
    login_to_generate: "請先登入以產生分析報告",
    login_to_use: "請先登入以使用物流碳足跡",
    tab_analysis: "碳排核算",
    tab_history: "歷史報告",
    tab_mileage: "里程核算",
    empty_plan: "此筆歷史資料無詳細路線方案。請重新產生報告。",
    auto: "自動判斷",
  },
  history: {
    title: "歷史分析路徑",
  },
  plan_section: {
    mode_land: "純陸運",
    mode_sea: "海運",
    mode_air: "空運",
    title_custom: "自訂多段路線",
    title_sea_land_air: "海陸空聯運專案",
    transit_airport: "中轉機場",
    title_land: "純陸運專案",
    title_sea: "海運專案",
    title_air: "空運專案",
    origin_port: "起運港口",
    dest_port: "目的港口",
    origin_airport: "起運機場",
    dest_airport: "目的機場",
    origin: "起點",
    dest: "終點",
    total_emissions_est: "{{title}}總碳排放量估算",
    total_weight: "總重量",
    metric_ton: "公噸",
    coefficient_disclosure: "碳排係數與公式揭露",
    formula: "公式: 總里程(km) × (重量(kg)/1000) × 碳排係數",
    source: "資料來源",
    section_analysis: "{{title}}區段分析",
    est_mileage: "預估里程:",
    emission_coefficient: "排放係數:",
    carbon_emissions: "碳排放量",
    fallback_estimate_badge: "估算值",
    fallback_estimate_hint: "路網圖資未涵蓋此區域,以直線距離 ×1.2 推估",
  },
  mileage_calculator: {
    title_paste: "貼上文本自動解析",
    placeholder:
      "請貼上包含起點與終點的物流文本，例如：'從台北出發，運送至高雄'...",
    btn_ai_parse: "AI 自動解析",
    title_manual: "手動輸入與分析清單",
    origin_desc: "起點描述",
    dest_desc: "終點描述",
    btn_add: "加入清單",
    col_id: "編號",
    col_origin: "起點",
    col_dest: "終點",
    col_mileage: "里程 (KM)",
    col_status: "狀態",
    col_action: "操作",
    btn_calculate: "開始核算里程",
    btn_delete: "刪除",
    err_required: "起點與終點皆為必填",
    err_calc_failed: "核算失敗，請稍後再試。",
    err_parse_failed: "解析失敗",
    err_no_valid_routes: "無法從檔案中解析出有效的起訖點。",
    err_waypoints_incomplete_title: "中繼站資料不齊全",
    err_waypoints_incomplete_msg:
      "有些中繼站尚未設定經緯度，請點擊自動解析或手動填寫經緯度後再試。",
    label_waypoints_optional: "中繼站 (選填)",
    btn_setup: "設定...",
    col_waypoints: "中繼站設定",
    waypoint_modal_title: "中繼站設定",
    waypoint_modal_empty: "無中繼站。點擊下方按鈕新增。",
    waypoint_modal_placeholder:
      "輸入地點，例如：Singapore 或 Port of Rotterdam",
    waypoint_modal_auto_parse: "自動解析經緯度",
    waypoint_modal_auto_parse_short: "自動解析",
    waypoint_modal_lat: "緯度 (Latitude)",
    waypoint_modal_lng: "經度 (Longitude)",
    waypoint_modal_add: "新增中繼站",
    waypoint_modal_confirm: "確定",
    empty_list: "目前尚無清單，請新增或貼上文本解析",
    col_mode: "運輸模式",
    mode_auto: "AI 自動判斷",
    mode_LAND: "純陸運",
    mode_AIR_LAND: "空陸聯運",
    mode_SEA_LAND: "海陸聯運",
    mode_SEA_LAND_AIR: "海陸空聯運",
    recalculate: "重新計算",
    short_land: "陸",
    short_sea: "海",
    short_air: "空",
    csv_total_dist: "總里程(km)",
    csv_land_dist: "陸運(km)",
    csv_sea_dist: "海運(km)",
    csv_air_dist: "空運(km)",
    csv_pdf_file: "PDF檔案",
  },
  map: {
    maptiler_key_not_set: "MapTiler Key 尚未設定！",
    origin: "起點",
    dest: "終點",
    label: "🟢 ESG 物流碳盤查軌跡 (Powered by MapLibre)",
  },
  // Info: (20260724 - Tzuhan) 匯出勾選選單(需求二)
  methodology: {
    title: "計算方式說明",
    intro:
      "以下逐節說明每一個數字是怎麼來的。若只想知道結論的可信範圍，直接看第十一節「已知限制」。",
    limits_title: "使用這份數字前必讀",
    read_full: "看完整計算方式說明",
    highlights: [
      "計算範圍**只含運輸過程**：不含倉儲、裝卸、包裝，也不含貨物本身的生產與廢棄。這份數字不等於產品的完整生命週期碳足跡。",
      "道路路網**目前僅覆蓋臺灣**：境外的陸運段以直線距離乘 {{landTortuosity}} 推估，並在報告中標上「估算值」。若某條路線以境外陸運為主，推估誤差會直接進入結果。",
      "海運與空運係數的**生產區域為美國**（公告年份 2016 與 2017），且空運距離未計繞飛與高空輻射強迫加成，實際影響高於本報告數值。",
    ],
    sections: [
      {
        id: "scope",
        title: "一、本工具計算什麼、不計算什麼",
        paragraphs: [
          "本工具估算貨物由起點運至迄點的運輸階段溫室氣體排放，以二氧化碳當量（CO₂e）表示。計算範圍僅含「運輸過程」本身。",
          "**不包含**：倉儲、裝卸、包裝、貨物本身的生產與廢棄、以及運具的製造與維護。因此本工具的結果不等於該批貨物的完整生命週期碳足跡，不可單獨作為產品碳足跡聲明的依據。",
        ],
      },
      {
        id: "factors",
        title: "二、排放係數與來源",
        paragraphs: [
          "係數單位為 {{factorUnit}}，即每公噸貨物運送一公里的排放量。",
        ],
        items: [
          {
            term: "陸運 LAND",
            detail: "{{landFactor}} — {{landSource}}",
          },
          {
            term: "海運 SEA",
            detail: "{{seaFactor}} — {{seaSource}}",
          },
          {
            term: "空運 AIR",
            detail: "{{airFactor}} — {{airSource}}",
          },
          {
            term: "係數的唯一來源",
            detail:
              "三個係數以常數集中定義，計算、畫面、CSV、PDF 皆引用同一份，不存在第二套數值。係數不隨貨物種類、運具噸級、裝載率或空重回程調整 —— 一條路線只會套用該模式的單一係數。",
          },
        ],
      },
      {
        id: "datasets",
        title: "三、使用的資料庫與圖資",
        items: [
          {
            term: "機場",
            detail:
              "靜態資料集共 {{airportsTotal}} 筆，含名稱、IATA 代碼、規模與座標。其中 {{airportsSelectable}} 筆具備 IATA 代碼並得作為接駁機場（見第四節）。",
          },
          {
            term: "港口",
            detail:
              "靜態資料集共 {{seaports}} 筆，含 UN/LOCODE 形式的識別碼、名稱、國別與座標。",
          },
          {
            term: "航線圖資",
            detail:
              "全球商船航道的線段圖資，共 {{shippingLaneFeatures}} 條線段，用於海運路徑規劃（見第六節）。",
          },
          {
            term: "道路路網",
            detail:
              "自建 OSRM 路徑服務，路網取自 OpenStreetMap 的區域萃取檔，採預設小客車路徑設定。**目前僅載入臺灣範圍**，範圍外的陸運段一律改以推估（見第五節與第十一節）。",
          },
          {
            term: "地圖底圖",
            detail:
              "報告內的路線圖使用 MapTiler 的向量圖磚樣式，以 MapLibre 渲染。底圖僅供視覺參考，不參與任何距離或排放計算。",
          },
        ],
      },
      {
        id: "nodes",
        title: "四、接駁機場與港口如何選定",
        paragraphs: [
          "起點與迄點各自獨立選出「距離最近」的機場與港口，距離以大圓距離（地球平均半徑 {{earthRadiusKm}} km）衡量，逐筆比較整份資料集後取最小者。",
        ],
        items: [
          {
            term: "機場的採用條件",
            detail:
              "須具備 IATA 代碼。此條件排除軍用基地、科考跑道與重複紀錄等不可能承運貨物的場站。",
          },
          {
            term: "港口的採用條件",
            detail:
              "無條件 —— 資料集不含可判斷貨運能力的欄位，故僅能取最近者。",
          },
          {
            term: "未納入考量的因素",
            detail:
              "不判斷該場站是否實際經營貨運、是否有直航班次、是否與起點位於同一國家或陸塊，亦不考慮通關、宵禁或跑道長度限制。選出的節點是「地理上最近」，不必然是「實務上會使用」的節點。",
          },
        ],
      },
      {
        id: "land",
        title: "五、陸運距離的計算",
        items: [
          {
            term: "主要方法",
            detail:
              "向自建 OSRM 服務請求兩點間的行車路徑，取其回報的路徑長度。請求逾時 {{osrmTimeoutSeconds}} 秒。",
          },
          {
            term: "路徑的否決條件",
            detail:
              "行車距離不足直線距離的 {{osrmMinRatioPercent}}%，或距離為零而兩點並非同一位置時，判定座標被錯誤吸附到圖資邊界，不採用該路徑。路徑中含渡輪段者亦不採用 —— 渡輪的排放特性與公路貨運不同，套用陸運係數會失真。",
          },
          {
            term: "無法取得路徑時",
            detail:
              "改以大圓距離乘上繞行係數 {{landTortuosity}} 推估，並在報告中標上「估算值」。此係數反映實際道路較直線繞行的一般程度，不針對個別路線校正。",
          },
        ],
      },
      {
        id: "sea",
        title: "六、海運距離的計算",
        paragraphs: [
          "海運**不採用**港到港的大圓距離，也不使用既有的港距表，而是在航線圖資上實際規劃路徑。",
        ],
        items: [
          {
            term: "路徑規劃方式",
            detail:
              "將航道線段的頂點建成圖，相鄰頂點間以大圓距離為邊權重，取其中最大的連通分量後以 A* 演算法求最短路徑。起訖港座標先吸附到最近的航道節點。",
          },
          {
            term: "距離的組成",
            detail:
              "起點到起始航道節點的大圓距離，加上航道路徑上各相鄰節點的大圓距離總和，再加上結束節點到迄點的大圓距離。",
          },
          {
            term: "無法規劃路徑時",
            detail:
              "改以大圓距離乘上繞行係數 {{seaTortuosity}} 推估，並標上「估算值」。海運係數高於陸運，因為航道受陸塊與海峽限制，繞行幅度較大。",
          },
        ],
      },
      {
        id: "air",
        title: "七、空運距離的計算",
        items: [
          {
            term: "計算方式",
            detail:
              "兩機場間的大圓距離（地球平均半徑 {{earthRadiusKm}} km），即球面上的最短路徑長度。",
          },
          {
            term: "未納入的加成",
            detail:
              "不加入航路繞飛、起降爬升、等待航線或替代降落的額外距離，亦不套用高空排放的輻射強迫加成（RFI）。因此空運段的距離是實際飛行距離的下界。",
          },
          {
            term: "地圖上的弧線",
            detail:
              "報告圖上的空運弧線為大圓路徑的插值，僅供視覺呈現，不影響距離數值。",
          },
        ],
      },
      {
        id: "plans",
        title: "八、運輸方案的組成",
        items: [
          {
            term: "純陸運",
            detail: "起點 →（陸）→ 迄點，單一段落。",
          },
          {
            term: "海運聯運",
            detail:
              "起點 →（陸）→ 出口港 →（海）→ 進口港 →（陸）→ 迄點，共三段。",
          },
          {
            term: "空運聯運",
            detail:
              "起點 →（陸）→ 出口機場 →（空）→ 進口機場 →（陸）→ 迄點，共三段。",
          },
          {
            term: "海陸空聯運",
            detail:
              "起點 →（陸）→ 出口港 →（海）→ 進口港 →（陸）→ 中轉機場 →（空）→ 目的機場 →（陸）→ 迄點，共五段。中轉機場取進口港的最近機場。",
          },
          {
            term: "自訂聯運",
            detail:
              "依使用者指定的途經點串接。每兩點間優先嘗試陸運，無法取得實際路徑時改為「陸運至最近港 → 海運 → 港口陸運至下一點」。",
          },
          {
            term: "接駁段一律視為陸運",
            detail:
              "機場與港口的進出接駁沒有另訂演算法，與純陸運使用同一套路徑計算與同一個陸運係數。",
          },
        ],
      },
      {
        id: "applicability",
        title: "九、方案的適用性判定",
        paragraphs: [
          "不適用的方案不會產生報告，而非產生一份數值為零的報告。判定為純函式，前後端共用同一份規則。",
        ],
        items: [
          {
            term: "海運",
            detail:
              "港到港距離須達 {{minSeaKm}} km 以上（低於此值視為同港或鄰港的退化情形），且海運段規劃成功。",
          },
          {
            term: "空運",
            detail:
              "機場到機場距離須達 {{minAirKm}} km 以上（低於此值不具商業空運意義），且空運段規劃成功。",
          },
          {
            term: "陸運勝出時排除聯運",
            detail:
              "若存在可實際行駛的陸運路徑，且其距離不長於某聯運方案的總距離，該聯運方案視為不適用 —— 沒有理由為了更遠的路徑而轉運。",
          },
          {
            term: "「可實際行駛」的定義",
            detail:
              "路徑規劃成功、非推估值、且回傳的路徑幾何超過兩個座標點。僅有起訖兩點的幾何代表那是一條直線，不是真實路徑。",
          },
        ],
      },
      {
        id: "formula",
        title: "十、計算公式與數值精度",
        items: [
          {
            term: "逐段排放",
            detail:
              "逐段 CO₂e（kg）= 距離（km）× 重量（公噸）× 該模式係數。重量由輸入的公斤數除以 1000 換算為公噸。",
          },
          {
            term: "方案總排放",
            detail:
              "由後端計算引擎產出，並非報告逐列相加的結果。兩者同源於相同的逐段數值，但總計以未捨入的精度計算，故逐列相加可能與總計相差幾分位。報告會揭露該差額及其來源。",
          },
          {
            term: "精度處理",
            detail:
              "所有乘除以十進位高精度數值運算，不使用原生浮點數，結果以字串傳遞以避免格式化過程產生誤差。",
          },
          {
            term: "顯示位數",
            detail:
              "報告中的距離與排放量四捨五入至小數兩位。完整精度見同批匯出的 summary.csv。",
          },
        ],
      },
      {
        id: "limitations",
        title: "十一、已知限制",
        paragraphs: [
          "以下限制會影響數值的可靠程度，列出供使用者判斷本報告是否足以支持其用途。",
        ],
        items: [
          {
            term: "道路路網僅覆蓋臺灣",
            detail:
              "非臺灣境內的陸運段無法取得實際路徑，一律以直線距離乘繞行係數推估。若某條路線的排放以境外陸運為主，推估誤差會直接進入結果。報告會揭露推估段數及其占比。",
          },
          {
            term: "部分軍用場站仍可能被選為接駁機場",
            detail:
              "IATA 代碼可排除多數軍用基地，但仍有部分軍民共用或持有 IATA 的軍用場站通過條件。未以名稱比對補強，因為以字串猜測用途會誤傷合法的軍民共用機場。",
          },
          {
            term: "最近的機場不必然是貨運機場",
            detail:
              "IATA 代碼只證明有商業運作，不證明有貨運能力。實務上可能選到以商務航空為主的機場，而真正的貨運樞紐較遠未被選中。修正此點需要貨運吞吐量或貨運航線資料，現有資料集不含這些欄位。",
          },
          {
            term: "港口無法依貨運能力篩選",
            detail:
              "港口資料集不含規模、吞吐量或貨種欄位，因此只能取最近者，無法排除漁港或無貨櫃設施的港口。",
          },
          {
            term: "海運與空運係數並非臺灣本土資料",
            detail:
              "預設係數組取自環境部產品碳足跡資訊網，但該網收錄的海運與空運係數其**生產區域為美國**，公告年份分別為 2016 與 2017；僅陸運係數為臺灣區域、2022 年公告。空運更只有單一未區分航程的通用值，不像部分國際資料庫另分國內、短程與長程。報告的係數來源欄位一律標明區域與年份，供查核者判斷其代表性。",
          },
          {
            term: "換用不同係數組會顯著改變結果",
            detail:
              "同一條路線改用不同係數組，申報值可差近一倍 —— 以長程空運為主的路線相差約 93%，純陸運路線約 16%。報告標頭標示採用的係數組版本，以便區分不同批次的產出。",
          },
          {
            term: "空運距離為下界",
            detail:
              "不計繞飛、爬升與高空輻射強迫加成，實際飛行距離與氣候影響均高於本報告數值。",
          },
          {
            term: "海運推估值仍計入結果",
            detail:
              "海運路徑規劃失敗時的推估值會照常納入排放計算與方案適用性判定；而陸運路徑失敗時，純陸運方案會被判定為不可用。兩者處理方式不同。",
          },
          {
            term: "航線圖資的版本未記錄",
            detail:
              "航道圖資以靜態檔提供，系統未記錄其來源機構、發布版本與授權條款，因此無法追溯該圖資的更新時點。",
          },
        ],
      },
    ],
  },
  guide: {
    title: "操作說明",
    subtitle:
      "從一句話的路線描述，到可交付的 PDF 與 CSV，這裡是完整流程。往下接著是每一個數字的計算方式與已知限制。",
    nav_title: "本頁目錄",
    figure_note:
      "圖為介面示意圖：以畫面實際使用的元件樣式與實際字串重繪，因此會隨介面語言與深淺主題變化，不是某一版的畫面擷取。圖上的編號對應圖下的說明。",
    figure_caption: "示意圖：{{title}}",
    start_cta: "開始碳排核算",
    empty_cta: "第一次使用？看操作說明",
    chapters: [
      {
        id: "overview",
        title: "一、四個分頁各自負責什麼",
        summary:
          "先認位置。這個工具把四件不同的事分在四個分頁，走錯分頁是最常見的卡點。",
        steps: [
          {
            id: "overview_tabs",
            title: "分頁的分工",
            body: "碳排核算算「一條路線的排放」，里程核算算「很多條路線的距離」，歷史報告是已完成的分析，使用說明就是本頁。",
            figure: GUIDE_FIGURE_ID.TABS,
            callouts: [
              "**碳排核算**：輸入一組起訖點與重量，產出含地圖、逐段里程與排放量的完整報告，可匯出 PDF。每次產生扣 {{analysisCost}} 點。",
              "**里程核算**：一次處理多條路線，可貼上文本或匯入 Excel／CSV，只產出各段距離。適合先盤點路線，再決定要對哪幾條做完整核算。",
              "**歷史報告**：列出過去的分析，可重新載入檢視或直接匯出，不重算、不再扣點。",
              "**使用說明**：本頁。切換分頁不會清掉已經填好的內容。",
            ],
            notes: [
              "分頁狀態寫在網址的 ?tab= 參數上，可以把某個分頁的連結直接傳給同事。",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "二、碳排核算：從一句話到一份報告",
        summary: "一條路線、一份報告，共四步。",
        steps: [
          {
            id: "analysis_describe",
            title: "描述路線，或直接填座標",
            body: "在「運輸路線描述」用一句話寫清楚起點、迄點與重量，按下「產生分析報告」。系統會先請 AI 從這句話裡萃取參數，這一步不扣點。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_INPUT,
            callouts: [
              "**運輸路線描述**：一句話即可，例如「從臺北國父紀念館運送 5000 公斤的石板到曼徹斯特博物館」。AI 只負責把文字轉成起訖點與重量，所有距離與排放都由後端的確定性規則引擎計算。",
              "**進階參數手動配置**：需要精確座標時展開它，直接填經緯度與總重。五個欄位一旦填齊，系統即以手動值為準，**不再呼叫 AI 解析**。",
              "**產生分析報告**：按下後先解析、再跳出付款確認。解析完成會自動展開進階參數，讓你在付款前核對它抓到的座標與重量。",
            ],
            notes: [
              "在描述欄位打字會清空已填的經緯度與重量。這是為了避免「描述寫著紐約、座標留著上一次的東京」這種前後不一致。",
              "解析結果不對就直接改進階參數裡的數字，不必重寫描述。",
            ],
          },
          {
            id: "analysis_pay",
            title: "確認扣點",
            body: "參數齊全後會跳出付款確認。這是唯一會扣點的地方——在此之前的解析、切換分頁、瀏覽歷史都不扣點。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_PAYMENT,
            callouts: [
              "**所需點數**：本項分析每次 {{analysisCost}} 點。若你屬於某個有額度的團隊，會優先扣團隊額度，對話框上會顯示實際扣款來源與餘額。",
              "**支付並生成**：按下後開始計算。同一組參數再算一次會再扣一次點，故建議先在上一步核對座標與重量。",
            ],
          },
          {
            id: "analysis_read",
            title: "讀懂報告",
            body: "報告以「方案」為單位：純陸運、海運聯運、空運聯運、海陸空聯運各自一張卡片，含地圖、逐段里程與排放量。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_REPORT,
            callouts: [
              "**方案切換**：只會出現適用的方案。兩港距離不足 {{minSeaKm}} km、兩機場不足 {{minAirKm}} km，或陸運本身就不比該聯運方案遠時，該方案不會出現。",
              "**方案代碼**（如 R01-SEA）貫穿畫面、PDF 檔名與 CSV 每一列，是三者互相對照的唯一索引。",
              "標上 **「估算值」** 的區段代表路徑規劃沒有成功，改以直線距離乘繞行係數推估（陸運 ×{{landTortuosity}}、海運 ×{{seaTortuosity}}）。核對報告時請先看這裡有幾段。",
              "**總碳排放量**由後端以未捨入的精度計算，因此逐段相加可能與總計差幾分位；報告會揭露該差額及其來源。",
              "**碳排係數與公式**一律揭露在報告內：總里程(km) × (重量(kg)/1000) × 該模式係數。",
            ],
            notes: [
              "看不到某個方案不是漏算。適用性判定會把不適用的方案整個移除，而不是給你一份數值為零的報告；規則見下方「九、方案的適用性判定」。",
            ],
          },
          {
            id: "analysis_export",
            title: "匯出 PDF 與 CSV",
            body: "在報告或歷史清單按下「匯出報告」，會先出現勾選選單，決定要匯出哪些方案、是否包含排放數值。",
            figure: GUIDE_FIGURE_ID.EXPORT_MODAL,
            callouts: [
              "**勾選方案**：只列出此路線適用的方案。每個方案產出獨立的一份 PDF，多份會打包成 ZIP。",
              "**計算二氧化碳當量**：取消勾選則 PDF 與 CSV 都不會出現任何排放數值，只留路徑與距離。",
              "**排放係數組**是揭露而非選項：顯示的就是計算實際採用的那一組。想改用其他係數，請取消上一項勾選，取得距離版 CSV 後自行套用。",
              "匯出的 summary.csv 帶完整精度與方案代碼，可與同名 PDF 逐列對照。",
            ],
            notes: [
              "匯出期間畫面會被滿版的進度提示蓋住。那是為了避免截圖時抓到底下的內容，不是卡住。",
            ],
          },
        ],
      },
      {
        id: "mileage",
        title: "三、里程核算：一次處理很多條路線",
        summary: "只想知道距離，或一次要處理幾十條路線時走這裡。",
        steps: [
          {
            id: "mileage_run",
            title: "建立清單並核算里程",
            body: "貼上一段文字讓 AI 解析，或手動逐條加入，也可以直接匯入 Excel／CSV。清單建好後按「開始核算里程」一次算完。",
            figure: GUIDE_FIGURE_ID.MILEAGE_FLOW,
            callouts: [
              "**貼上文本自動解析**：把出貨單或郵件內容整段貼進來，按「AI 自動解析」拆成起訖點清單。",
              "**中繼站（選填）**：需要指定途經點時在此設定。每個中繼站都必須有經緯度，可按自動解析取得；缺座標的中繼站會讓核算停下來並提示。",
              "**批次匯入**：支援 .xlsx／.xls／.csv。匯入時會讓你把檔案欄位對應到起點、終點與中繼站，不要求固定的欄位名稱。",
              "**運輸模式**：預設「AI 自動判斷」，也可以指定純陸運、海陸聯運、空陸聯運或海陸空聯運，強制以該組合計算。",
              "**開始核算里程**：整份清單一次送出。算完後可逐條或整批匯出，匯出流程與碳排核算相同。",
            ],
            notes: [
              "里程核算的結果也會進歷史報告，回頭載入時會自動切到「里程核算」分頁呈現。",
            ],
          },
        ],
      },
      {
        id: "history",
        title: "四、歷史報告：回頭檢視與補件",
        summary: "已完成的分析都留在這裡，重新檢視與匯出都不再扣點。",
        steps: [
          {
            id: "history_reopen",
            title: "重新載入或直接匯出",
            body: "清單依時間排列，狀態為 COMPLETED 的才可載入。載入後會自動切到對應的分頁，並把當時的起訖點與重量一併還原。",
            figure: GUIDE_FIGURE_ID.HISTORY_TABLE,
            callouts: [
              "**核算類型**分辨這筆是碳排核算還是里程核算——兩者載入後會切到不同的分頁。含多條路線的里程核算可以展開逐條檢視。",
              "**載入**把當時的報告重新開出來檢視，不重算、不扣點。",
              "**匯出報告**在載入完成後直接開啟匯出勾選選單，適合只想補一份 PDF 的情形。",
            ],
            notes: [
              "載入後網址會帶上 analysisId，可以把連結直接傳給同事，或用瀏覽器的上一頁精準回到清單。",
            ],
          },
        ],
      },
      {
        id: "troubleshoot",
        title: "五、常見狀況",
        summary: "以下都是設計上的行為，不是故障。",
        steps: [
          {
            id: "trouble_missing_plan",
            title: "某個運輸方案沒有出現",
            body: "適用性判定認定它不適用：兩港距離不足 {{minSeaKm}} km、兩機場距離不足 {{minAirKm}} km，或陸運本身就不比該聯運方案遠。此時該方案整個不產出，而非產出一份零值報告。",
          },
          {
            id: "trouble_estimate",
            title: "里程旁邊出現「估算值」標記",
            body: "該段的路徑規劃沒有成功，改以直線距離乘繞行係數推估（陸運 ×{{landTortuosity}}、海運 ×{{seaTortuosity}}）。道路路網**目前僅覆蓋臺灣**，故境外陸運段幾乎都是推估值。",
          },
          {
            id: "trouble_total_mismatch",
            title: "逐段相加與總計差了幾分位",
            body: "總計由後端以未捨入的精度計算，而畫面上的逐段數值已四捨五入至小數兩位，兩者相加自然會差。報告會揭露該差額；需要完整精度請看匯出的 summary.csv。",
          },
          {
            id: "trouble_no_payment",
            title: "按下產生分析報告卻沒有跳出付款",
            body: "參數不完整時不會進到付款流程。請確認描述欄位有內容，或進階參數的五個欄位全部填齊；錯誤訊息會出現在參數配置卡片下方。",
          },
        ],
      },
    ],
  },
  export_options: {
    title: "選擇匯出方案",
    description: "請勾選要匯出的方案類型，僅列出此路線適用的方案。",
    plan_land: "純陸運",
    plan_sea: "包含海運（海陸聯運）",
    plan_air: "包含空運（空陸聯運）",
    plan_custom: "自訂多式聯運",
    plan_seaLandAir: "海陸空聯運(陸→海→陸→空→陸)",
    include_co2e: "計算二氧化碳當量",
    include_co2e_hint:
      "取消勾選則僅匯出路徑與距離，PDF 與 CSV 都不會出現任何排放數值。",
    factor_set: "排放係數組",
    factor_set_hint:
      "若需採用其他係數，請取消勾選上方選項：匯出的 CSV 含逐段距離與重量，可自行套用。",
    split_hint: "每個方案將產出獨立的 PDF 檔案；多份檔案將打包為 ZIP 下載。",
    confirm: "匯出",
    progress: "正在產生第 {{current}} / {{total}} 份報告...",
  },
};
