import { LucideIcon } from "lucide-react";

/**
 * Info: (20260731 - Julian) 圖表 AI 輔助工具的共用型別
 *
 * 各圖表（直方圖 / 龍捲風圖 / 矩陣圖 / XY 圖 / 甘特圖 / 桑基圖 / 流程圖 / 圓餅圖）
 * 的 tools submenu 先前各自重複定義 IToolItem 與 IBasePanelProps，
 * 此模組以泛型一次收斂，避免第 9 種圖表再複製一份。
 */

/**
 * Info: (20260731 - Julian) 工具列單一項目
 * @template TTool 該圖表的工具列舉（如 HistogramTools、TornadoTools）
 */
export interface IToolItem<TTool extends string> {
  tool: TTool;
  icon: LucideIcon;
}

/**
 * Info: (20260731 - Julian) 工具面板共用 Props
 * @template TParsed 該圖表字串的解析結果（如 IHistogramParseResult）
 * @template TAction 該圖表的動作聯集（如 IHistogramAction）
 */
export interface IChartPanelProps<TParsed, TAction> {
  parsedData: TParsed;
  onAddAction: (action: TAction) => void;
}
