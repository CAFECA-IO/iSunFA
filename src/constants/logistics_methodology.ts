// Info: (20260801 - Luphia) 物流碳足跡的計算方式說明(方法論)。
//
// Info: (20260801 - Luphia) 為什麼這份說明必須存在:報告頁尾印出計算公式,等於邀請查核者
// Info: (20260801 - Luphia) 自行重算。但公式只說明「最後一步乘法」,而距離從哪來、
// Info: (20260801 - Luphia) 機場怎麼挑、哪些數字是推估的,才是決定結論是否可信的環節。
//
// Info: (20260801 - Luphia) **零捏造要求此處只能寫程式碼真正做的事。** 每一條敘述都對應
// Info: (20260801 - Luphia) 可查核的實作;數值一律由常數插入而非重打一遍,避免調參後說明落後。
// Info: (20260801 - Luphia) 資料筆數無法從常數取得(靜態 JSON,且前端不宜為了顯示筆數而載入
// Info: (20260801 - Luphia) 五千筆資料),故寫成常數並由 logistics_methodology.test.ts
// Info: (20260801 - Luphia) 對實際檔案斷言 —— 資料換版而筆數變動時測試會失敗,不會靜默過期。

import {
  EMISSION_FACTORS,
  EMISSION_FACTOR_SOURCES,
  EMISSION_FACTOR_UNIT,
  ESTIMATION_TORTUOSITY_FACTORS,
  MIN_AIR_LEG_DISTANCE_KM,
  MIN_SEA_LEG_DISTANCE_KM,
} from "@/constants/logistics";

/**
 * Info: (20260801 - Luphia) 靜態資料的筆數。由測試對實際 JSON 斷言,不可手改。
 */
export const METHODOLOGY_DATASET_COUNTS = {
  airportsTotal: 5277,
  airportsSelectable: 4563,
  seaports: 3924,
  shippingLaneFeatures: 3599,
} as const;

/** Info: (20260801 - Luphia) 大圓距離採用的地球平均半徑,與 @/lib/utils/geo 一致 */
const EARTH_RADIUS_KM = 6371;

/** Info: (20260801 - Luphia) OSRM 路徑的否決門檻:駕駛距離不足直線距離此比例即視為座標吸附錯誤 */
const OSRM_MIN_RATIO_TO_DIRECT = 0.5;

/** Info: (20260801 - Luphia) OSRM 請求逾時(ms) */
const OSRM_TIMEOUT_MS = 10000;

export interface IMethodologyItem {
  term: string;
  detail: string;
}

export interface IMethodologySection {
  /** Info: (20260801 - Luphia) 錨點用識別碼,亦為 React key */
  id: string;
  title: string;
  /** Info: (20260801 - Luphia) 段落敘述,置於條列之前 */
  paragraphs?: string[];
  items?: IMethodologyItem[];
}

/**
 * Info: (20260801 - Luphia) 說明內容。頁面區塊與 PDF 附錄共用這一份 ——
 * 兩處各寫一份必然失去同步,而「網頁說的與報告說的不一樣」對審計文件是致命的。
 */
export const LOGISTICS_METHODOLOGY_SECTIONS: IMethodologySection[] = [
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
      `係數單位為 ${EMISSION_FACTOR_UNIT}，即每公噸貨物運送一公里的排放量。`,
    ],
    items: [
      {
        term: "陸運 LAND",
        detail: `${EMISSION_FACTORS.LAND} — ${EMISSION_FACTOR_SOURCES.LAND}`,
      },
      {
        term: "海運 SEA",
        detail: `${EMISSION_FACTORS.SEA} — ${EMISSION_FACTOR_SOURCES.SEA}`,
      },
      {
        term: "空運 AIR",
        detail: `${EMISSION_FACTORS.AIR} — ${EMISSION_FACTOR_SOURCES.AIR}`,
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
        detail: `靜態資料集共 ${METHODOLOGY_DATASET_COUNTS.airportsTotal} 筆，含名稱、IATA 代碼、規模與座標。其中 ${METHODOLOGY_DATASET_COUNTS.airportsSelectable} 筆具備 IATA 代碼並得作為接駁機場（見第四節）。`,
      },
      {
        term: "港口",
        detail: `靜態資料集共 ${METHODOLOGY_DATASET_COUNTS.seaports} 筆，含 UN/LOCODE 形式的識別碼、名稱、國別與座標。`,
      },
      {
        term: "航線圖資",
        detail: `全球商船航道的線段圖資，共 ${METHODOLOGY_DATASET_COUNTS.shippingLaneFeatures} 條線段，用於海運路徑規劃（見第六節）。`,
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
      `起點與迄點各自獨立選出「距離最近」的機場與港口，距離以大圓距離（地球平均半徑 ${EARTH_RADIUS_KM} km）衡量，逐筆比較整份資料集後取最小者。`,
    ],
    items: [
      {
        term: "機場的採用條件",
        detail:
          "須具備 IATA 代碼。此條件排除軍用基地、科考跑道與重複紀錄等不可能承運貨物的場站。",
      },
      {
        term: "港口的採用條件",
        detail: "無條件 —— 資料集不含可判斷貨運能力的欄位，故僅能取最近者。",
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
        detail: `向自建 OSRM 服務請求兩點間的行車路徑，取其回報的路徑長度。請求逾時 ${OSRM_TIMEOUT_MS / 1000} 秒。`,
      },
      {
        term: "路徑的否決條件",
        detail: `行車距離不足直線距離的 ${OSRM_MIN_RATIO_TO_DIRECT * 100}%，或距離為零而兩點並非同一位置時，判定座標被錯誤吸附到圖資邊界，不採用該路徑。路徑中含渡輪段者亦不採用 —— 渡輪的排放特性與公路貨運不同，套用陸運係數會失真。`,
      },
      {
        term: "無法取得路徑時",
        detail: `改以大圓距離乘上繞行係數 ${ESTIMATION_TORTUOSITY_FACTORS.LAND} 推估，並在報告中以 est. 標記。此係數反映實際道路較直線繞行的一般程度，不針對個別路線校正。`,
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
        detail: `改以大圓距離乘上繞行係數 ${ESTIMATION_TORTUOSITY_FACTORS.SEA} 推估，並以 est. 標記。海運係數高於陸運，因為航道受陸塊與海峽限制，繞行幅度較大。`,
      },
    ],
  },
  {
    id: "air",
    title: "七、空運距離的計算",
    items: [
      {
        term: "計算方式",
        detail: `兩機場間的大圓距離（地球平均半徑 ${EARTH_RADIUS_KM} km），即球面上的最短路徑長度。`,
      },
      {
        term: "未納入的加成",
        detail:
          "不加入航路繞飛、起降爬升、等待航線或替代降落的額外距離，亦不套用高空排放的輻射強迫加成（RFI）。因此空運段的距離是實際飛行距離的下界。所採用的長程空運係數本身已包含部分間接效應，但距離低估的部分不因此抵銷。",
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
      { term: "純陸運", detail: "起點 →（陸）→ 迄點，單一段落。" },
      {
        term: "海運聯運",
        detail: "起點 →（陸）→ 出口港 →（海）→ 進口港 →（陸）→ 迄點，共三段。",
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
        detail: `港到港距離須達 ${MIN_SEA_LEG_DISTANCE_KM} km 以上（低於此值視為同港或鄰港的退化情形），且海運段規劃成功。`,
      },
      {
        term: "空運",
        detail: `機場到機場距離須達 ${MIN_AIR_LEG_DISTANCE_KM} km 以上（低於此值不具商業空運意義），且空運段規劃成功。`,
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
          "逐段 CO₂e(kg) = 距離（km） × 重量（公噸） × 該模式係數。重量由輸入的公斤數除以 1000 換算為公噸。",
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
];
