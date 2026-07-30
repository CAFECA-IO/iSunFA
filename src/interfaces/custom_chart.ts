import {
  CustomChartType,
  CustomChartParseErrorCode,
  HistogramTrendType,
  HistogramActionType,
  MatrixActionType,
  TornadoActionType,
  TornadoMode,
} from "@/constants/custom_chart";

/**
 * Info: (20260716 - Julian)
 * 自訂圖表的 JSON AST 定義。
 * 解析器僅負責萃取，不對數值做任何計算或正規化。
 */

/**
 * Info: (20260716 - Julian) 矩陣圖座標軸：min/max 為雙極端點文字，scale 為選填的座標上限
 */
export interface ICustomChartAxis {
  min?: string; // Info: (20260716 - Julian) min 文字
  max?: string; // Info: (20260716 - Julian) max 文字
  scale?: number; // Info: (20260716 - Julian) 軸範圍
}

// Info: (20260716 - Julian) 矩陣圖（重大性/四象限散佈）
export interface ICustomMatrixPoint {
  label: string;
  x: number;
  y: number;
  group?: string; // Info: (20260716 - Julian) 群組配色
}

export interface ICustomMatrixAst {
  type: CustomChartType.MATRIX;
  title?: string;
  xAxis: ICustomChartAxis;
  yAxis: ICustomChartAxis;
  points: ICustomMatrixPoint[];
  // Info: (20260721 - Julian) 群組 → HEX 顏色對照（存於資料列第 5 欄；未指定的群組由渲染層套用預設調色盤）
  groupColors?: Record<string, string>;
  // Info: (20260721 - Julian) 四象限底色（Q1..Q4，index 0=右上、1=左上、2=左下、3=右下）；缺項由渲染層套用預設
  quadrantColors?: string[];
}

/**
 * Info: (20260721 - Julian)
 * 矩陣圖資料點（含原始行號），供結構化編輯以 lineIndex 精準定位 DSL 中的資料列。
 * lineIndex 為 raw.split("\n") 的絕對索引（沿用 mermaid ISankeyLink 的定位設計）。
 */
export interface IMatrixItem extends ICustomMatrixPoint {
  lineIndex: number;
}

/**
 * Info: (20260721 - Julian)
 * 矩陣圖工具列所需的解析結果：資料點（帶行號）與兩軸雙極端點文字。
 */
export interface IMatrixParseResult {
  title?: string;
  xAxis: ICustomChartAxis;
  yAxis: ICustomChartAxis;
  items: IMatrixItem[];
  groups: string[]; // Info: (20260721 - Julian) 依首次出現順序去重的群組清單（對應 ISankeyData.nodes）
  groupColors: Record<string, string>; // Info: (20260721 - Julian) 群組 → HEX 顏色對照（供選色盤預填目前顏色；無設定則為空物件）
  quadrantColors: string[]; // Info: (20260721 - Julian) 四象限底色（Q1..Q4，供選色盤預填；無設定則為空陣列）
}

/**
 * Info: (20260721 - Julian)
 * 矩陣圖結構化編輯動作（Discriminated Union，以 type 為判別因子）。
 * 對應 matrix_tools_submenu 的四項工具，由 applyMatrixAction 決定論套用。
 */
export type IMatrixAction = {
  id: string;
  description: string;
} & (
  | {
      // Info: (20260721 - Julian) 新增資料點（標題、X/Y 座標、群組）
      type: MatrixActionType.ADD_ITEM;
      payload: { label: string; x: number; y: number; group: string };
    }
  | {
      // Info: (20260721 - Julian) 編輯資料點：以 lineIndex 定位，覆寫標題、座標與群組
      type: MatrixActionType.EDIT_ITEM;
      payload: {
        lineIndex: number;
        label: string;
        x: number;
        y: number;
        group: string;
      };
    }
  | {
      // Info: (20260721 - Julian) 編輯雙極軸端點文字（皆選填；空字串代表移除該軸設定）
      type: MatrixActionType.EDIT_AXIS;
      payload: { xMin?: string; xMax?: string; yMin?: string; yMax?: string };
    }
  | {
      /**
       * Info: (20260721 - Julian) 編輯群組：一次套用「成員組成」與「群組顏色」。
       * memberLineIndexes 為最終應屬於此群組的資料列行號；未列入而原屬此群組者將被移出（取消分組）。
       * color 選填：提供時將該群組所有成員的第 5 欄顏色統一為此 HEX；空／未提供則保留各列既有顏色。
       */
      type: MatrixActionType.EDIT_GROUP;
      payload: { group: string; memberLineIndexes: number[]; color?: string };
    }
  | {
      // Info: (20260721 - Julian) 變更四象限底色：colors 依序對應 Q1..Q4（右上、左上、左下、右下）
      type: MatrixActionType.CHANGE_QUADRANT_COLOR;
      payload: { colors: string[] };
    }
  | {
      // Info: (20260721 - Julian) 刪除資料點：以 lineIndex 或 group 定位
      type: MatrixActionType.DELETE_ITEM;
      payload: { lineIndex?: number; group?: string };
    }
);

// Info: (20260720 - Julian) 龍捲風圖（成對雙數列比較，butterfly）：left/right 為兩數列各自數值，以中心向左右延伸
export interface ICustomTornadoBar {
  category: string; // Info: (20260720 - Julian) 列標籤（必填）
  left: number; // Info: (20260720 - Julian) 左側數列數值（繪製長度依此，不做任何計算）
  right: number; // Info: (20260720 - Julian) 右側數列數值
}

export interface ICustomTornadoAst {
  type: CustomChartType.TORNADO;
  title?: string;
  unit?: string;
  mode?: TornadoMode; // Info: (20260723 - Julian) 圖表型別（未設定＝compare 比較型）
  baseline?: number; // Info: (20260723 - Julian) 敏感度型的中心基準值（compare 型忽略）
  leftSeries?: string; // Info: (20260720 - Julian) 左側數列名稱（選填；未填則不顯示圖例）
  rightSeries?: string; // Info: (20260720 - Julian) 右側數列名稱（選填；未填則不顯示圖例）
  leftColor?: string; // Info: (20260723 - Julian) 左數列顏色 HEX（選填；未填採預設）
  rightColor?: string; // Info: (20260723 - Julian) 右數列顏色 HEX（選填；未填採預設）
  bars: ICustomTornadoBar[];
}

/**
 * Info: (20260723 - Julian)
 * 龍捲風圖資料列（含原始行號），供編輯／刪除工具以 lineIndex 精準定位 DSL 中的資料列。
 */
export interface ITornadoItem extends ICustomTornadoBar {
  lineIndex: number;
}

/**
 * Info: (20260723 - Julian)
 * 龍捲風圖工具列所需的解析結果：資料列（帶行號）＋數列標頭名稱／顏色＋基準線／單位。
 * hasHeader 標記 DSL 是否已有數列標頭列，供 EDIT_GROUP 決定改寫或插入。
 */
export interface ITornadoParseResult {
  title?: string;
  unit?: string;
  mode?: TornadoMode;
  baseline?: number;
  leftSeries?: string;
  rightSeries?: string;
  leftColor?: string;
  rightColor?: string;
  bars: ITornadoItem[];
  hasHeader: boolean;
}

/**
 * Info: (20260723 - Julian)
 * 龍捲風圖結構化編輯動作（Discriminated Union，以 type 為判別因子），由 applyTornadoAction 決定論套用。
 */
export type ITornadoAction = {
  id: string;
  description: string;
} & (
  | {
      // Info: (20260723 - Julian) 圖表設定：型別（mode）、單位（unit）、基準值（baseline，敏感度型用）
      // 皆選填；unit 空字串代表移除設定；baseline 僅在敏感度型有意義
      type: TornadoActionType.EDIT_SETTINGS;
      payload: { mode?: TornadoMode; unit?: string; baseline?: number };
    }
  | {
      // Info: (20260723 - Julian) 新增分析項目（category, 左值, 右值）
      type: TornadoActionType.ADD_ITEM;
      payload: { category: string; left: number; right: number };
    }
  | {
      // Info: (20260723 - Julian) 編輯項目數值：以 lineIndex 定位，覆寫名稱與左右數值
      type: TornadoActionType.EDIT_ITEM;
      payload: {
        lineIndex: number;
        category: string;
        left: number;
        right: number;
      };
    }
  | {
      // Info: (20260723 - Julian) 編輯數列分組：設定左右數列名稱（標頭列）與顏色（設定列）
      type: TornadoActionType.EDIT_GROUP;
      payload: {
        leftSeries: string;
        rightSeries: string;
        leftColor?: string;
        rightColor?: string;
      };
    }
  | {
      // Info: (20260723 - Julian) 刪除分析項目：以 lineIndex 定位
      type: TornadoActionType.DELETE_ITEM;
      payload: { lineIndex: number };
    }
);

// Info: (20260716 - Julian) 直方圖（已分箱，parser 不自動分箱）
export interface ICustomHistogramBin {
  label: string;
  count: number;
}

export interface ICustomHistogramAst {
  type: CustomChartType.HISTOGRAM;
  title?: string;
  xAxis?: string;
  yAxis?: string;
  trend?: HistogramTrendType; // Info: (20260720 - Julian) 選填趨勢線（如常態分佈）
  trendColor?: string; // Info: (20260730 - Julian) 趨勢線顏色 HEX（選填；未填採預設色）
  bins: ICustomHistogramBin[];
}

/**
 * Info: (20260728 - Julian)
 * 直方圖分箱（含原始行號），供結構化編輯以 lineIndex 精準定位 DSL 中的資料列。
 * lineIndex 為 raw.split("\n") 的絕對索引（沿用 ITornadoItem 的定位設計）。
 */
export interface IHistogramItem extends ICustomHistogramBin {
  lineIndex: number;
}

/**
 * Info: (20260728 - Julian)
 * 直方圖工具列所需的解析結果：分箱（帶行號）＋圖表標題／XY 軸標籤／趨勢線設定。
 * 直方圖已分箱、無數列標頭列概念，故不含 hasHeader；trend 沿用 parser 的嚴格列舉驗證結果。
 */
export interface IHistogramParseResult {
  title?: string;
  xAxis?: string;
  yAxis?: string;
  trend?: HistogramTrendType;
  trendColor?: string; // Info: (20260730 - Julian) 趨勢線顏色 HEX（供工具面板預填目前色；未設定則 undefined）
  bins: IHistogramItem[];
}

/**
 * Info: (20260730 - Julian)
 * 直方圖結構化編輯動作（Discriminated Union，以 type 為判別因子），由 applyHistogramAction 決定論套用。
 * 各成員 payload 對應 histogram_tools_submenu 的五項工具 UI。
 */
export type IHistogramAction = {
  id: string;
  description: string;
} & (
  | {
      // Info: (20260730 - Julian) 新增分箱：label / count 與插入位置 lineIndex（新列佔用該 raw 行、其後順移）
      type: HistogramActionType.ADD_ITEM;
      payload: { label: string; count: number; lineIndex: number };
    }
  | {
      // Info: (20260730 - Julian) 編輯分箱：以 lineIndex 定位，覆寫 label / count，並移動到 newLineIndex
      type: HistogramActionType.EDIT_ITEM;
      payload: {
        lineIndex: number;
        label: string;
        count: number;
        newLineIndex: number;
      };
    }
  | {
      // Info: (20260730 - Julian) 編輯軸線標題：xAxis / yAxis（皆選填；空字串代表移除該設定列）
      type: HistogramActionType.EDIT_AXIS;
      payload: { xAxis?: string; yAxis?: string };
    }
  | {
      // Info: (20260730 - Julian) 切換趨勢線：trend 有值＝開啟（並可帶 trendColor）；trend 省略＝關閉（移除趨勢線設定）
      type: HistogramActionType.SWITCH_TREND_LINE;
      payload: { trend?: HistogramTrendType; trendColor?: string };
    }
  | {
      // Info: (20260730 - Julian) 刪除分箱：以 lineIndex 定位
      type: HistogramActionType.DELETE_ITEM;
      payload: { lineIndex: number };
    }
);

// Info: (20260716 - Julian) 盒鬚圖（五數綜合，parser 不自動計算四分位）
export interface ICustomBoxItem {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export interface ICustomBoxAst {
  type: CustomChartType.BOXPLOT;
  title?: string;
  yAxis?: string;
  unit?: string;
  boxes: ICustomBoxItem[];
}

/**
 * Info: (20260716 - Julian) 所有自訂圖表 AST 的判別聯集（以 type 為判別因子）
 */
export type ICustomChartAst =
  | ICustomMatrixAst
  | ICustomTornadoAst
  | ICustomHistogramAst
  | ICustomBoxAst;

/**
 * Info: (20260723 - Julian)
 * 所有自訂圖表結構化編輯動作的聯集，供通用 AI 編輯器（adapter / dispatcher）承載。
 * 各 apply 引擎依 chartType 取用對應子集。
 */
export type ICustomChartAction =
  | IMatrixAction
  | ITornadoAction
  | IHistogramAction;

/**
 * Info: (20260716 - Julian)
 * parseCustomChart 的回傳結果：成功回 typed AST，失敗回錯誤碼與訊息（永不 throw）
 */
export type ICustomChartParseResult =
  | { ok: true; ast: ICustomChartAst }
  | { ok: false; code: CustomChartParseErrorCode; message: string };
