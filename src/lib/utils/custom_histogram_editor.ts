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
 * 將「一批」結構化動作決定論地套用到直方圖 DSL 字串，回傳新字串（不變更輸入）。
 *
 * 穩定索引策略（解決 stacked-actions 的 lineIndex 位移問題）：
 * 直方圖分箱有順序，且新增／編輯皆為「定位插入」，故不能單純附加於尾端；改採
 * 「tombstone 刪除 + 以原始行號錨定的 insertBefore 桶」：套用期間完全不 splice 原始行，
 * 所有動作的 lineIndex／newLineIndex 皆穩定對應原始 raw 快照：
 *   1. 資料列動作：新增／移動的內容放進 insertBefore[原始行號] 桶；刪除（含移動來源）僅標記 tombstone。
 *   2. 依原始行號順序 materialize：於每個原始行前先倒出插入桶，未刪除者再輸出原行；最後倒出尾端桶（key = 長度）。
 *   3. 設定列動作（軸標題／趨勢線，可能插入設定列）最後才套用，避免位移。
 * 定位失敗或已刪除的目標一律略過（Fail Safe）。純字串操作、決定論、不呼叫 LLM、不做數值計算。
 */
export const applyHistogramActions = (
  raw: string,
  actions: readonly IHistogramAction[],
): string => {
  const lines = raw.split("\n");
  const originalLength = lines.length;
  const deleted = new Set<number>();
  // Info: (20260730 - Julian) key = 要插入於「原始行號」之前的位置（0..originalLength，長度代表附加於尾端）
  const insertBefore = new Map<number, string[]>();
  const configActions: IHistogramAction[] = [];

  const isTargetableDataLine = (idx: number): boolean =>
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < originalLength &&
    !deleted.has(idx) &&
    getHistogramBinFields(lines[idx]) !== null;

  const pushInsert = (at: number, line: string): void => {
    if (!Number.isInteger(at)) return;
    const key = Math.min(Math.max(at, 0), originalLength);
    const bucket = insertBefore.get(key);
    if (bucket) bucket.push(line);
    else insertBefore.set(key, [line]);
  };

  actions.forEach((action) => {
    switch (action.type) {
      case HistogramActionType.ADD_ITEM: {
        // Info: (20260730 - Julian) 新分箱錨定插入於目標原始行號之前（超界則尾端）
        const { label, count, lineIndex } = action.payload;
        pushInsert(lineIndex, buildHistogramDataLine(label, count));
        break;
      }
      case HistogramActionType.EDIT_ITEM: {
        // Info: (20260730 - Julian) 移動＝刪除來源（tombstone）+ 於 newLineIndex 錨定插入更新後內容
        const { lineIndex, label, count, newLineIndex } = action.payload;
        if (!isTargetableDataLine(lineIndex)) break;
        // Info: (20260731 - Julian) 先驗 newLineIndex 再 tombstone：非整數（NaN／小數）會被 pushInsert 擋下，
        // Info: (20260731 - Julian) 若先 deleted.add 就會「刪了卻沒插回」造成該列靜默消失，故整個動作一併略過
        if (!Number.isInteger(newLineIndex)) break;
        deleted.add(lineIndex);
        pushInsert(newLineIndex, buildHistogramDataLine(label, count));
        break;
      }
      case HistogramActionType.DELETE_ITEM: {
        const { lineIndex } = action.payload;
        if (isTargetableDataLine(lineIndex)) deleted.add(lineIndex);
        break;
      }
      case HistogramActionType.EDIT_AXIS:
      case HistogramActionType.SWITCH_TREND_LINE: {
        // Info: (20260730 - Julian) 設定列動作延後套用
        configActions.push(action);
        break;
      }
      default:
        break;
    }
  });

  // Info: (20260730 - Julian) 依原始行號 materialize：先倒插入桶、再輸出未刪除原行；最後倒尾端桶
  const materialized: string[] = [];
  for (let i = 0; i < originalLength; i += 1) {
    const bucket = insertBefore.get(i);
    if (bucket) materialized.push(...bucket);
    if (!deleted.has(i)) materialized.push(lines[i]);
  }
  const tailBucket = insertBefore.get(originalLength);
  if (tailBucket) materialized.push(...tailBucket);

  // Info: (20260730 - Julian) 最後套用設定列動作（此時資料列索引已不再被引用）
  configActions.forEach((action) => {
    if (action.type === HistogramActionType.EDIT_AXIS) {
      const { xAxis, yAxis } = action.payload;
      if (xAxis !== undefined) {
        setConfigLine(materialized, CustomChartConfigKey.X_AXIS, xAxis.trim());
      }
      if (yAxis !== undefined) {
        setConfigLine(materialized, CustomChartConfigKey.Y_AXIS, yAxis.trim());
      }
    } else if (action.type === HistogramActionType.SWITCH_TREND_LINE) {
      const { trend, trendColor } = action.payload;
      if (trend === undefined) {
        setConfigLine(materialized, CustomChartConfigKey.TREND, "");
        setConfigLine(materialized, CustomChartConfigKey.TREND_COLOR, "");
      } else {
        setConfigLine(materialized, CustomChartConfigKey.TREND, trend);
        setConfigLine(
          materialized,
          CustomChartConfigKey.TREND_COLOR,
          (trendColor ?? "").trim(),
        );
      }
    }
  });

  return materialized.join("\n");
};

/**
 * Info: (20260730 - Julian)
 * 將單一結構化動作套用到直方圖 DSL 字串（委派批次引擎，語意一致，保留既有呼叫端 API）。
 */
export const applyHistogramAction = (
  raw: string,
  action: IHistogramAction,
): string => applyHistogramActions(raw, [action]);
