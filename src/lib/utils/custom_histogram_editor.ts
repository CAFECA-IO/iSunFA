import {
  CustomChartType,
  CustomChartConfigKey,
  HistogramTrendType,
  HistogramActionType,
  CUSTOM_CHART_COMMENT_PREFIX,
} from "@/constants/custom_chart";
import {
  IHistogramItem,
  IHistogramParseResult,
  IHistogramAction,
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
  CustomChartConfigKey.TREND_COLOR,
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
    const { title, xAxis, yAxis, trend, trendColor } = result.ast;
    return { bins, title, xAxis, yAxis, trend, trendColor };
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
    trendColor: readConfigValue(lines, CustomChartConfigKey.TREND_COLOR),
  };
};

/**
 * Info: (20260730 - Julian)
 * 將單一欄位序列化為 CSV（RFC 4180）：含逗號／雙引號／換行／前後空白時以雙引號包夾並跳脫，與 parseCsvLine 對稱。
 */
const formatCsvField = (field: string): string => {
  const needsQuote = /[",\r\n]/.test(field) || field !== field.trim();
  return needsQuote ? `"${field.replace(/"/g, '""')}"` : field;
};

// Info: (20260730 - Julian) 組合一行直方圖資料列（label, count）；count 原樣輸出（不做任何運算）
const buildHistogramDataLine = (label: string, count: number): string =>
  `${formatCsvField(label)}, ${count}`;

// Info: (20260730 - Julian) 尋找第一筆內容列（標頭/資料）行號，用於在無現有設定列時插入設定於其前
const findFirstContentIndex = (lines: string[]): number =>
  lines.findIndex((line) => isContentLine(line));

/**
 * Info: (20260730 - Julian)
 * 更新（或插入／移除）指定設定列（key: value）。value 為空字串時移除該設定列；就地修改 lines。
 * 設定在上、資料在下：無現有設定列時插入到第一筆內容列之前。
 */
const setConfigLine = (
  lines: string[],
  key: CustomChartConfigKey,
  value: string,
): void => {
  const idx = lines.findIndex((line) => {
    const clean = line.trim();
    const colonIdx = clean.indexOf(":");
    return (
      colonIdx !== -1 && clean.slice(0, colonIdx).trim().toLowerCase() === key
    );
  });

  if (value === "") {
    if (idx !== -1) lines.splice(idx, 1);
    return;
  }

  const newLine = `${key}: ${value}`;
  if (idx !== -1) {
    lines[idx] = newLine;
    return;
  }
  const contentIdx = findFirstContentIndex(lines);
  if (contentIdx === -1) {
    lines.push(newLine);
  } else {
    lines.splice(contentIdx, 0, newLine);
  }
};

/**
 * Info: (20260730 - Julian)
 * 將單一結構化動作決定論地套用到直方圖 DSL 字串，回傳新字串（不變更輸入）。
 * 以 lineIndex（raw.split("\n") 絕對索引）定位資料列；未知類型或定位失敗時原樣返回（Fail Safe）。
 * 純字串操作、決定論、不呼叫 LLM、不做數值計算。
 * 註：動作 lineIndex 皆以「原始 raw」為準；單一動作套用安全，批次堆疊時的行號位移風險見 applyCustomChartActions。
 */
export const applyHistogramAction = (
  raw: string,
  action: IHistogramAction,
): string => {
  const lines = raw.split("\n");

  switch (action.type) {
    case HistogramActionType.ADD_ITEM: {
      // Info: (20260730 - Julian) 於目標行號插入新分箱列（該 raw 行被佔用、其後順移）；超界則附加於尾端
      const { label, count, lineIndex } = action.payload;
      const at = Math.min(Math.max(lineIndex, 0), lines.length);
      lines.splice(at, 0, buildHistogramDataLine(label, count));
      break;
    }

    case HistogramActionType.EDIT_ITEM: {
      // Info: (20260730 - Julian) 以 lineIndex 定位既有分箱，覆寫 label/count 並移動到 newLineIndex
      const { lineIndex, label, count, newLineIndex } = action.payload;
      if (lineIndex < 0 || lineIndex >= lines.length) break;
      if (!getHistogramBinFields(lines[lineIndex])) break;

      lines.splice(lineIndex, 1);
      // Info: (20260730 - Julian) 移除舊列後，若插入點原在其後需 -1 補償；再夾限到合法範圍
      const shifted =
        newLineIndex > lineIndex ? newLineIndex - 1 : newLineIndex;
      const at = Math.min(Math.max(shifted, 0), lines.length);
      lines.splice(at, 0, buildHistogramDataLine(label, count));
      break;
    }

    case HistogramActionType.DELETE_ITEM: {
      const { lineIndex } = action.payload;
      if (
        lineIndex >= 0 &&
        lineIndex < lines.length &&
        getHistogramBinFields(lines[lineIndex])
      ) {
        lines.splice(lineIndex, 1);
      }
      break;
    }

    case HistogramActionType.EDIT_AXIS: {
      // Info: (20260730 - Julian) 軸標題設定列（皆選填；空字串移除）
      const { xAxis, yAxis } = action.payload;
      if (xAxis !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.X_AXIS, xAxis.trim());
      }
      if (yAxis !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.Y_AXIS, yAxis.trim());
      }
      break;
    }

    case HistogramActionType.SWITCH_TREND_LINE: {
      // Info: (20260730 - Julian) trend 有值＝開啟（並套用顏色）；省略＝關閉（連同顏色一併移除）
      const { trend, trendColor } = action.payload;
      if (trend === undefined) {
        setConfigLine(lines, CustomChartConfigKey.TREND, "");
        setConfigLine(lines, CustomChartConfigKey.TREND_COLOR, "");
      } else {
        setConfigLine(lines, CustomChartConfigKey.TREND, trend);
        setConfigLine(
          lines,
          CustomChartConfigKey.TREND_COLOR,
          (trendColor ?? "").trim(),
        );
      }
      break;
    }

    default:
      return raw;
  }

  return lines.join("\n");
};
