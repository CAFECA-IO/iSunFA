import {
  CustomChartType,
  CustomChartParseErrorCode,
  HistogramTrendType,
  MatrixActionType,
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
      // Info: (20260721 - Julian) 編輯群組：一次套用「成員組成」與「群組顏色」。
      // memberLineIndexes 為最終應屬於此群組的資料列行號；未列入而原屬此群組者將被移出（取消分組）。
      // color 選填：提供時將該群組所有成員的第 5 欄顏色統一為此 HEX；空／未提供則保留各列既有顏色。
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
  leftSeries?: string; // Info: (20260720 - Julian) 左側數列名稱（選填；未填則不顯示圖例）
  rightSeries?: string; // Info: (20260720 - Julian) 右側數列名稱（選填；未填則不顯示圖例）
  bars: ICustomTornadoBar[];
}

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
  bins: ICustomHistogramBin[];
}

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
 * Info: (20260716 - Julian)
 * parseCustomChart 的回傳結果：成功回 typed AST，失敗回錯誤碼與訊息（永不 throw）
 */
export type ICustomChartParseResult =
  | { ok: true; ast: ICustomChartAst }
  | { ok: false; code: CustomChartParseErrorCode; message: string };
