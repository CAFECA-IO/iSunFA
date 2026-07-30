import {
  CustomChartType,
  CustomChartConfigKey,
  HistogramTrendType,
  CUSTOM_CHART_COMMENT_PREFIX,
} from "@/constants/custom_chart";
import {
  IHistogramItem,
  IHistogramParseResult,
} from "@/interfaces/custom_chart";
import { parseCsvLine } from "@/lib/utils/csv";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";

/**
 * Info: (20260728 - Julian)
 * 直方圖（custom-histogram）結構化編輯引擎的解析層。
 * 設計對應 custom_tornado_editor：以 lineIndex 定位資料列，純字串操作、決定論、不呼叫 LLM、不做數值計算。
 * 直方圖資料列為已分箱的 (label, count)；標題／XY 軸標籤／趨勢線以設定列表示。
 * 與龍捲風圖不同，直方圖無「數列標頭列」概念，資料列首欄為分箱標籤、次欄為次數。
 */

// Info: (20260728 - Julian) 直方圖設定列 key（對應 parser 的 CONFIG_KEYS_BY_TYPE[HISTOGRAM]）
const HISTOGRAM_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  CustomChartConfigKey.TITLE,
  CustomChartConfigKey.X_AXIS,
  CustomChartConfigKey.Y_AXIS,
  CustomChartConfigKey.TREND,
]);

const isNumericField = (raw: string | undefined): boolean => {
  if (raw === undefined) return false;
  const trimmed = raw.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed));
};

/**
 * Info: (20260728 - Julian) 是否為設定列（key: value，key 屬白名單、冒號在逗號之前）
 */
const isHistogramConfigLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return false;
  const commaIdx = line.indexOf(",");
  if (commaIdx !== -1 && colonIdx > commaIdx) return false;
  return HISTOGRAM_CONFIG_KEYS.has(
    line.slice(0, colonIdx).trim().toLowerCase(),
  );
};

/**
 * Info: (20260728 - Julian) 是否為「內容列」（非空、非註解、非設定列）；直方圖僅資料列屬之
 */
const isContentLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  return (
    line !== "" &&
    !line.startsWith(CUSTOM_CHART_COMMENT_PREFIX) &&
    !isHistogramConfigLine(line)
  );
};

/**
 * Info: (20260728 - Julian)
 * 回傳可編輯的「資料列」欄位（label, count 且 count 為有效數字），否則 null。
 */
const getHistogramBinFields = (rawLine: string): string[] | null => {
  if (!isContentLine(rawLine)) return null;
  const fields = parseCsvLine(rawLine.trim());
  if (fields.length < 2 || fields[0].trim() === "") return null;
  if (!isNumericField(fields[1])) return null;
  return fields;
};

/**
 * Info: (20260728 - Julian)
 * 讀取指定設定列的值（key: value）；找不到回 undefined。用於解析失敗時的降級擷取。
 */
const readConfigValue = (
  lines: string[],
  key: CustomChartConfigKey,
): string | undefined => {
  const found = lines.find((rawLine) => {
    const line = rawLine.trim();
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return false;
    const commaIdx = line.indexOf(",");
    if (commaIdx !== -1 && colonIdx > commaIdx) return false;
    return line.slice(0, colonIdx).trim().toLowerCase() === key;
  });
  if (found === undefined) return undefined;
  const colonIdx = found.indexOf(":");
  const value = found.slice(colonIdx + 1).trim();
  return value === "" ? undefined : value;
};

/**
 * Info: (20260728 - Julian)
 * 解析所有分箱資料列（附原始行號），略過設定列、註解與空行（永不 throw）。
 */
export const parseHistogramBins = (raw: string): IHistogramItem[] => {
  if (!raw || typeof raw !== "string") return [];
  const lines = raw.split("\n");

  const items: IHistogramItem[] = [];
  lines.forEach((line, lineIndex) => {
    const bin = getHistogramBinFields(line);
    if (!bin) return;
    items.push({
      label: bin[0],
      count: Number(bin[1]),
      lineIndex: lineIndex,
    });
  });
  return items;
};

/**
 * Info: (20260728 - Julian)
 * 解析直方圖工具列所需資料：分箱資料列（帶行號）＋標題／XY 軸標籤／趨勢線。
 * metadata 沿用 parseCustomChart 結果，避免解析邏輯分歧；解析失敗時退回逐行擷取設定列。
 * 永不 throw：解析器內部任何錯誤都收斂為結果物件，此處僅取其成功分支。
 */
export const parseHistogramData = (raw: string): IHistogramParseResult => {
  const bins = parseHistogramBins(raw);

  const result = parseCustomChart(CustomChartType.HISTOGRAM, raw);
  if (result.ok && result.ast.type === CustomChartType.HISTOGRAM) {
    const { title, xAxis, yAxis, trend } = result.ast;
    return { bins, title, xAxis, yAxis, trend };
  }

  // Info: (20260728 - Julian) 解析失敗（如缺資料列）：仍逐行擷取設定列，趨勢線僅接受合法列舉值
  const lines = typeof raw === "string" ? raw.split("\n") : [];
  const trendRaw = readConfigValue(lines, CustomChartConfigKey.TREND)
    ?.trim()
    .toLowerCase();
  const trend = Object.values(HistogramTrendType).find((t) => t === trendRaw);

  return {
    bins,
    title: readConfigValue(lines, CustomChartConfigKey.TITLE),
    xAxis: readConfigValue(lines, CustomChartConfigKey.X_AXIS),
    yAxis: readConfigValue(lines, CustomChartConfigKey.Y_AXIS),
    trend,
  };
};
