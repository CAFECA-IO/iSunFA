import {
  CustomChartType,
  CustomChartConfigKey,
  TornadoActionType,
  CUSTOM_CHART_COMMENT_PREFIX,
} from "@/constants/custom_chart";
import {
  ITornadoItem,
  ITornadoParseResult,
  ITornadoAction,
} from "@/interfaces/custom_chart";
import { parseCsvLine } from "@/lib/utils/csv";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";

/**
 * Info: (20260722 - Julian)
 * 龍捲風圖（custom-tornado）結構化編輯引擎。
 * 設計對應 custom_matrix_editor：以 lineIndex 定位資料列、附加式新增避免影響既有行號，
 * 純字串操作、決定論、不呼叫 LLM、不做數值計算。
 * 數列名稱以「標頭列」表示（category, leftSeries, rightSeries）；顏色/基準線/單位以設定列表示。
 */

// Info: (20260722 - Julian) 龍捲風圖設定列 key（對應 parser 的 CONFIG_KEYS_BY_TYPE[TORNADO]）
const TORNADO_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  CustomChartConfigKey.TITLE,
  CustomChartConfigKey.UNIT,
  CustomChartConfigKey.MODE,
  CustomChartConfigKey.BASELINE,
  CustomChartConfigKey.LEFT_COLOR,
  CustomChartConfigKey.RIGHT_COLOR,
]);

// Info: (20260722 - Julian) 插入標頭列時的類別欄預設標籤（渲染層不顯示此欄，僅供 header 判定）
const DEFAULT_CATEGORY_HEADER = "項目";

const formatCsvField = (field: string): string => {
  const needsQuote = /[",\r\n]/.test(field) || field !== field.trim();
  return needsQuote ? `"${field.replace(/"/g, '""')}"` : field;
};

const buildTornadoDataLine = (
  category: string,
  left: number,
  right: number,
): string => `${formatCsvField(category)}, ${left}, ${right}`;

const buildHeaderLine = (
  category: string,
  leftSeries: string,
  rightSeries: string,
): string =>
  `${formatCsvField(category)}, ${formatCsvField(leftSeries)}, ${formatCsvField(rightSeries)}`;

const isNumericField = (raw: string | undefined): boolean => {
  if (raw === undefined) return false;
  const trimmed = raw.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed));
};

/**
 * Info: (20260722 - Julian) 是否為設定列（key: value，key 屬白名單、冒號在逗號之前）
 */
const isTornadoConfigLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return false;
  const commaIdx = line.indexOf(",");
  if (commaIdx !== -1 && colonIdx > commaIdx) return false;
  return TORNADO_CONFIG_KEYS.has(line.slice(0, colonIdx).trim().toLowerCase());
};

/**
 * Info: (20260722 - Julian) 是否為「內容列」（非空、非註解、非設定列）；標頭列與資料列皆屬之
 */
const isContentLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  return (
    line !== "" &&
    !line.startsWith(CUSTOM_CHART_COMMENT_PREFIX) &&
    !isTornadoConfigLine(line)
  );
};

/**
 * Info: (20260722 - Julian) 是否為數列標頭列（第 2、3 欄皆非數字）
 */
const isHeaderFields = (fields: string[]): boolean =>
  fields.length >= 3 &&
  !isNumericField(fields[1]) &&
  !isNumericField(fields[2]);

/**
 * Info: (20260722 - Julian)
 * 回傳可編輯的「資料列」欄位（category, left, right 且左右為有效數字），否則 null（含標頭列）
 */
const getTornadoBarFields = (rawLine: string): string[] | null => {
  if (!isContentLine(rawLine)) return null;
  const fields = parseCsvLine(rawLine.trim());
  if (fields.length < 3 || fields[0] === "") return null;
  if (!isNumericField(fields[1]) || !isNumericField(fields[2])) return null;
  return fields;
};

const findFirstContentIndex = (lines: string[]): number =>
  lines.findIndex((line) => isContentLine(line));

/**
 * Info: (20260722 - Julian)
 * 解析所有資料列（附原始行號），略過設定列、註解、空行與標頭列（永不 throw）
 */
export const parseTornadoBars = (raw: string): ITornadoItem[] => {
  if (!raw || typeof raw !== "string") return [];
  const lines = raw.split("\n");
  const firstIdx = findFirstContentIndex(lines);

  const items: ITornadoItem[] = [];
  lines.forEach((line, lineIndex) => {
    if (!isContentLine(line)) return;
    // Info: (20260722 - Julian) 首個內容列若為標頭列則略過（不計入資料列）
    if (lineIndex === firstIdx && isHeaderFields(parseCsvLine(line.trim()))) {
      return;
    }
    const bar = getTornadoBarFields(line);
    if (!bar) return;
    items.push({
      category: bar[0],
      left: Number(bar[1]),
      right: Number(bar[2]),
      lineIndex,
    });
  });
  return items;
};

/**
 * Info: (20260722 - Julian)
 * 解析龍捲風圖工具列所需資料：資料列（帶行號）＋數列名稱／顏色／基準線／單位＋是否已有標頭列。
 * metadata 沿用 parseCustomChart 結果，避免解析邏輯分歧；解析失敗時退回以標頭列推導名稱。
 */
export const parseTornadoData = (raw: string): ITornadoParseResult => {
  const bars = parseTornadoBars(raw);
  const lines = raw.split("\n");
  const firstIdx = findFirstContentIndex(lines);
  const hasHeader =
    firstIdx !== -1 && isHeaderFields(parseCsvLine(lines[firstIdx].trim()));

  const result = parseCustomChart(CustomChartType.TORNADO, raw);
  if (result.ok && result.ast.type === CustomChartType.TORNADO) {
    const {
      title,
      unit,
      mode,
      baseline,
      leftSeries,
      rightSeries,
      leftColor,
      rightColor,
    } = result.ast;
    return {
      bars,
      hasHeader,
      title,
      unit,
      mode,
      baseline,
      leftSeries,
      rightSeries,
      leftColor,
      rightColor,
    };
  }

  // Info: (20260722 - Julian) 解析失敗（如缺資料列）：仍以標頭列推導名稱，其餘留空
  let leftSeries: string | undefined;
  let rightSeries: string | undefined;
  if (hasHeader) {
    const f = parseCsvLine(lines[firstIdx].trim());
    leftSeries = f[1]?.trim() || undefined;
    rightSeries = f[2]?.trim() || undefined;
  }
  return { bars, hasHeader, leftSeries, rightSeries };
};

/**
 * Info: (20260722 - Julian)
 * 更新（或插入／移除）指定設定列（key: value）。value 為空字串時移除該設定列。就地修改 lines。
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
  // Info: (20260722 - Julian) 無現有設定列 → 插入到第一筆內容列（標頭/資料）之前，維持設定在上
  const contentIdx = findFirstContentIndex(lines);
  if (contentIdx === -1) {
    lines.push(newLine);
  } else {
    lines.splice(contentIdx, 0, newLine);
  }
};

/**
 * Info: (20260723 - Julian)
 * 將單一結構化動作決定論地套用到龍捲風圖 DSL 字串，回傳新字串（不變更輸入）。
 * 未知類型或定位失敗時原樣返回（Fail Safe）。
 */
export const applyTornadoAction = (
  raw: string,
  action: ITornadoAction,
): string => {
  const lines = raw.split("\n");

  switch (action.type) {
    case TornadoActionType.EDIT_SETTINGS: {
      // Info: (20260723 - Julian) 圖表設定：型別、單位、基準值（皆選填；unit 空字串移除）
      const { mode, unit, baseline } = action.payload;
      if (mode !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.MODE, mode);
      }
      if (unit !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.UNIT, unit.trim());
      }
      if (baseline !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.BASELINE, String(baseline));
      }
      break;
    }

    case TornadoActionType.ADD_ITEM: {
      // Info: (20260722 - Julian) 附加到最後，避免影響既有資料列的 lineIndex
      const { category, left, right } = action.payload;
      lines.push(buildTornadoDataLine(category, left, right));
      break;
    }

    case TornadoActionType.EDIT_ITEM: {
      const { lineIndex, category, left, right } = action.payload;
      if (lineIndex < 0 || lineIndex >= lines.length) break;
      if (!getTornadoBarFields(lines[lineIndex])) break;
      lines[lineIndex] = buildTornadoDataLine(category, left, right);
      break;
    }

    case TornadoActionType.DELETE_ITEM: {
      const { lineIndex } = action.payload;
      if (
        lineIndex >= 0 &&
        lineIndex < lines.length &&
        getTornadoBarFields(lines[lineIndex])
      ) {
        lines.splice(lineIndex, 1);
      }
      break;
    }

    case TornadoActionType.EDIT_GROUP: {
      const { leftSeries, rightSeries, leftColor, rightColor } = action.payload;

      // Info: (20260722 - Julian) 數列顏色（設定列）：提供時更新，空字串移除
      if (leftColor !== undefined) {
        setConfigLine(lines, CustomChartConfigKey.LEFT_COLOR, leftColor.trim());
      }
      if (rightColor !== undefined) {
        setConfigLine(
          lines,
          CustomChartConfigKey.RIGHT_COLOR,
          rightColor.trim(),
        );
      }

      // Info: (20260722 - Julian) 數列名稱（標頭列）：有標頭則改寫（保留類別欄），否則於首筆資料列前插入
      const contentIdx = findFirstContentIndex(lines);
      if (contentIdx === -1) {
        lines.push(
          buildHeaderLine(DEFAULT_CATEGORY_HEADER, leftSeries, rightSeries),
        );
      } else {
        const firstFields = parseCsvLine(lines[contentIdx].trim());
        if (isHeaderFields(firstFields)) {
          const col0 = firstFields[0]?.trim() || DEFAULT_CATEGORY_HEADER;
          lines[contentIdx] = buildHeaderLine(col0, leftSeries, rightSeries);
        } else {
          lines.splice(
            contentIdx,
            0,
            buildHeaderLine(DEFAULT_CATEGORY_HEADER, leftSeries, rightSeries),
          );
        }
      }
      break;
    }

    default:
      return raw;
  }

  return lines.join("\n");
};
