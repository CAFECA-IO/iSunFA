import {
  CustomChartType,
  CustomChartParseErrorCode,
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
}

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
  type: CustomChartType.BOX;
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
