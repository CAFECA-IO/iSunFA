"use client";

import React, { useState, useEffect, FC } from "react";
import {
  ChartLine,
  ChartColumnBig,
  FilePlus,
  GitCommitHorizontal,
  GitCommitVertical,
  Trash2,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IXYChartData,
  IChartAction,
  MermaidActionType,
  XYChartDataType,
  XYChartAxisType,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";

// ==========================================
// Info: (20260709 - Julian) 定義與靜態映射表
// ==========================================

export enum XYChartTools {
  ADD_SERIES = "addSeries",
  CHANGE_X_AXIS_VALUES = "changeXAxisValues",
  CHANGE_Y_AXIS_VALUES = "changeYAxisValues",
  CHANGE_LINE_VALUES = "changeLineValues",
  CHANGE_BAR_VALUES = "changeBarValues",
  DELETE_SERIES = "deleteSeries",
}

interface IToolItem {
  tool: XYChartTools;
  icon: LucideIcon;
}

const XY_CHART_TOOLS: IToolItem[] = [
  {
    tool: XYChartTools.ADD_SERIES,
    icon: FilePlus,
  },
  {
    tool: XYChartTools.CHANGE_LINE_VALUES,
    icon: ChartLine,
  },
  {
    tool: XYChartTools.CHANGE_BAR_VALUES,
    icon: ChartColumnBig,
  },
  {
    tool: XYChartTools.CHANGE_X_AXIS_VALUES,
    icon: GitCommitHorizontal,
  },
  {
    tool: XYChartTools.CHANGE_Y_AXIS_VALUES,
    icon: GitCommitVertical,
  },
  {
    tool: XYChartTools.DELETE_SERIES,
    icon: Trash2,
  },
];

// ToDo: (20260710 - Julian) 補上翻譯檔

const XY_CHART_TOOL_TRANSLATION_KEYS: Record<XYChartTools, string> = {
  [XYChartTools.ADD_SERIES]: "新增數列",
  [XYChartTools.CHANGE_X_AXIS_VALUES]: "變更 X 軸",
  [XYChartTools.CHANGE_Y_AXIS_VALUES]: "變更 Y 軸",
  [XYChartTools.CHANGE_LINE_VALUES]: "變更折線圖",
  [XYChartTools.CHANGE_BAR_VALUES]: "變更長條圖",
  [XYChartTools.DELETE_SERIES]: "刪除數列",
};

// ==========================================
// Info: (20260707 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

interface IBasePanelProps {
  parsedXYChartData: IXYChartData;
  onAddAction: (action: IChartAction) => void;
}

// ==========================================
// Info: (20260707 - Julian) 內部通用小型組件
// ==========================================

// Info: (20260709 - Julian) 「新增數列」面板
const AddSeriesPanel: FC<IBasePanelProps> = ({ onAddAction }) => {
  const { t } = useTranslation();

  const [dataType, setDataType] = useState<XYChartDataType>(
    XYChartDataType.BAR,
  );
  const [nameInput, setNameInput] = useState<string>("");
  const [series, setSeries] = useState<string>("");

  const handleSubmit = () => {
    // Info: (20260709 - Julian) 拆解字串，轉成數字，過濾 NaN
    const data = series
      .split(",")
      .map((v) => parseFloat(v.trim()))
      .filter((n) => !isNaN(n));

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_ADD_SERIES,
      description: `新增 ${dataType} 數列`,
      payload: {
        type: dataType,
        seriesName: nameInput,
        data,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <FilePlus size={14} />
        <p>{t("新增數列")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={MERMAID_LABEL_STYLE}>{t("數列類型")}</label>
          <SegmentedControl
            value={dataType}
            onChange={(val) => setDataType(val as XYChartDataType)}
            options={[
              { label: t("長條圖"), value: XYChartDataType.BAR },
              { label: t("折線圖"), value: XYChartDataType.LINE },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="addSeriesNameInput" className={MERMAID_LABEL_STYLE}>
          {t("數列名稱")}
        </label>
        <input
          id="addSeriesNameInput"
          type="text"
          className={MERMAID_INPUT_STYLE}
          value={nameInput}
          placeholder={t("請輸入數列名稱，例如：數列 A...也可省略")}
          onChange={(e) => setNameInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="seriesValuesInput" className={MERMAID_LABEL_STYLE}>
          {t("數列 (以逗號分隔)")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <input
          id="seriesValuesInput"
          type="text"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          className={MERMAID_INPUT_STYLE}
          placeholder="e.g. 10, 20, 30"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!series.trim()}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("新增數列")}
      </button>
    </div>
  );
};

// Info: (20260709 - Julian) 「變更 X 軸」面板
const EditXAxisPanel: FC<IBasePanelProps> = ({
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const { xAxis } = parsedXYChartData;

  const [xAxisTitle, setXAxisTitle] = useState<string>(xAxis.title || "");
  const [xAxisType, setXAxisType] = useState<XYChartAxisType>(
    xAxis.categories ? XYChartAxisType.CATEGORY : XYChartAxisType.NUMERIC,
  );
  const [xAxisCategories, setXAxisCategories] = useState<string>(
    xAxis.categories ? xAxis.categories.join(", ") : "",
  );
  const [minInput, setMinInput] = useState<string>(
    xAxis.min !== undefined ? String(xAxis.min) : "",
  );
  const [maxInput, setMaxInput] = useState<string>(
    xAxis.max !== undefined ? String(xAxis.max) : "",
  );

  const isSubmitDisable =
    (xAxisType === XYChartAxisType.CATEGORY && !xAxisCategories.trim()) ||
    (xAxisType === XYChartAxisType.NUMERIC && !minInput && !maxInput);

  const handleSubmit = () => {
    const isCategory = xAxisType === XYChartAxisType.CATEGORY;
    const payload: {
      title?: string;
      categories?: string[];
      min?: number;
      max?: number;
    } = {};

    if (isCategory) {
      payload.categories = xAxisCategories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    } else {
      payload.title = xAxisTitle || undefined;
      payload.min = minInput !== "" ? Number(minInput) : undefined;
      payload.max = maxInput !== "" ? Number(maxInput) : undefined;
    }

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_CHANGE_X_AXIS,
      description: `變更 X 軸設定`,
      payload,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <GitCommitHorizontal size={14} />
        <p>{t("變更 X 軸")}</p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="xAxisTitle" className={MERMAID_LABEL_STYLE}>
          {t("X 軸標題")}
        </label>
        <input
          id="xAxisTitle"
          type="text"
          value={xAxisTitle}
          onChange={(e) => setXAxisTitle(e.target.value)}
          className={MERMAID_INPUT_STYLE}
          placeholder="e.g. 時間"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={MERMAID_LABEL_STYLE}>{t("X 軸類型")}</label>
          <SegmentedControl
            value={xAxisType}
            onChange={(val) => setXAxisType(val as XYChartAxisType)}
            options={[
              { label: t("分類 (Category)"), value: XYChartAxisType.CATEGORY },
              {
                label: t("數值區間 (Numeric)"),
                value: XYChartAxisType.NUMERIC,
              },
            ]}
          />
        </div>

        {xAxisType === XYChartAxisType.CATEGORY ? (
          <div className="flex flex-col">
            <label htmlFor="xAxisCategories" className={MERMAID_LABEL_STYLE}>
              {t("分類項目 (以逗號分隔)")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="xAxisCategories"
              type="text"
              value={xAxisCategories}
              onChange={(e) => setXAxisCategories(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder="e.g. 1月, 2月, 3月"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label htmlFor="xAxisMin" className={MERMAID_LABEL_STYLE}>
                {t("最小值")}
              </label>
              <input
                id="xAxisMin"
                type="number"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                className={MERMAID_INPUT_STYLE}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="xAxisMax" className={MERMAID_LABEL_STYLE}>
                {t("最大值")}
              </label>
              <input
                id="xAxisMax"
                type="number"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className={MERMAID_INPUT_STYLE}
                placeholder="100"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisable}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260709 - Julian) 「變更 Y 軸」面板
const EditYAxisPanel: FC<IBasePanelProps> = ({
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const { yAxis } = parsedXYChartData;

  const [yAxisTitle, setYAxisTitle] = useState<string>(yAxis.title || "");
  const [minInput, setMinInput] = useState<string>(
    yAxis.min !== undefined ? String(yAxis.min) : "",
  );
  const [maxInput, setMaxInput] = useState<string>(
    yAxis.max !== undefined ? String(yAxis.max) : "",
  );

  const isSubmitDisable = !minInput && !maxInput;

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_CHANGE_Y_AXIS,
      description: `變更 Y 軸設定`,
      payload: {
        title: yAxisTitle || undefined,
        min: minInput !== "" ? Number(minInput) : undefined,
        max: maxInput !== "" ? Number(maxInput) : undefined,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <GitCommitVertical size={14} />
        <p>{t("變更 Y 軸")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="yAxisTitle" className={MERMAID_LABEL_STYLE}>
            {t("Y 軸標題")}
          </label>
          <input
            id="yAxisTitle"
            type="text"
            value={yAxisTitle}
            onChange={(e) => setYAxisTitle(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder="e.g. 金額 (元)"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <label htmlFor="yAxisMin" className={MERMAID_LABEL_STYLE}>
              {t("最小值 (選填)")}
            </label>
            <input
              id="yAxisMin"
              type="number"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder="自動"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="yAxisMax" className={MERMAID_LABEL_STYLE}>
              {t("最大值 (選填)")}
            </label>
            <input
              id="yAxisMax"
              type="number"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder="自動"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisable}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260709 - Julian) 「變更折線圖」面板
const EditLinePanel: FC<IBasePanelProps> = ({
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const categories = parsedXYChartData.xAxis.categories || [];
  const lineSeries = parsedXYChartData.series.filter(
    (s) => s.type === XYChartDataType.LINE,
  );

  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [nameInput, setNameInput] = useState<string>(
    lineSeries[targetIndex].seriesName,
  );
  const [dataType, setDataType] = useState<XYChartDataType>(
    XYChartDataType.LINE,
  );
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [rawValues, setRawValues] = useState<string>("");

  const isSubmitDisabled = !rawValues || rawValues.length == 0;

  useEffect(() => {
    const selectedSeries = lineSeries[targetIndex];
    if (selectedSeries) {
      if (categories.length > 0) {
        const initialVals = categories.map((_, i) =>
          String(selectedSeries.data[i] ?? ""),
        );
        setCategoryValues(initialVals);
      } else {
        setRawValues(selectedSeries.data.join(", "));
      }
    } else {
      if (categories.length > 0) {
        setCategoryValues(categories.map(() => ""));
      } else {
        setRawValues("");
      }
    }
  }, [targetIndex, parsedXYChartData]);

  const handleSubmit = () => {
    const data =
      categories.length > 0
        ? categoryValues
            .map((v) => parseFloat(v))
            .map((n) => (isNaN(n) ? 0 : n))
        : rawValues
            .split(",")
            .map((v) => parseFloat(v.trim()))
            .filter((n) => !isNaN(n));

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_CHANGE_LINE_SERIES,
      description: `變更折線圖數值 (數列 #${targetIndex + 1})`,
      payload: {
        seriesIndex: targetIndex,
        type: dataType,
        data,
        seriesName: nameInput,
      },
    });
  };

  const handleCategoryValueChange = (idx: number, val: string) => {
    setCategoryValues((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  if (lineSeries.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        {t("此圖表目前無折線圖數據")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <ChartLine size={14} />
        <p>{t("變更折線圖")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={MERMAID_LABEL_STYLE}>{t("數列類型")}</label>
          <SegmentedControl
            value={dataType}
            onChange={(val) => setDataType(val as XYChartDataType)}
            options={[
              { label: t("長條圖"), value: XYChartDataType.BAR },
              { label: t("折線圖"), value: XYChartDataType.LINE },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lineNameInput" className={MERMAID_LABEL_STYLE}>
          {t("數列名稱")}
        </label>
        <input
          id="lineNameInput"
          type="text"
          className={MERMAID_INPUT_STYLE}
          value={nameInput}
          placeholder={t("請輸入數列名稱，例如：數列 A...也可省略")}
          onChange={(e) => setNameInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        {lineSeries.length > 1 && (
          <div className="flex flex-col">
            <label htmlFor="lineTarget" className={MERMAID_LABEL_STYLE}>
              {t("選擇欲修改的折線圖數列")}
            </label>
            <select
              id="lineTarget"
              value={targetIndex}
              onChange={(e) => setTargetIndex(Number(e.target.value))}
              className={MERMAID_INPUT_STYLE}
            >
              {lineSeries.map((s) => (
                <option key={`line-opt-${s.lineIndex}`} value={s.lineIndex}>
                  {`折線圖數列 #${s.lineIndex}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {categories.length > 0 ? (
          <div className="flex flex-col">
            <label className={MERMAID_LABEL_STYLE}>
              {t("輸入各分類對應數值")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat, idx) => (
                <div key={`line-cat-val-${idx}`} className="flex flex-col">
                  <span className="truncate text-[10px] font-bold text-slate-400">
                    {cat}
                  </span>
                  <input
                    type="number"
                    value={categoryValues[idx] ?? ""}
                    onChange={(e) =>
                      handleCategoryValueChange(idx, e.target.value)
                    }
                    className={MERMAID_INPUT_STYLE}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <label htmlFor="lineRawValues" className={MERMAID_LABEL_STYLE}>
              {t("數值 (以逗號分隔)")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="lineRawValues"
              type="text"
              value={rawValues}
              onChange={(e) => setRawValues(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder="e.g. 10, 20, 30"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260709 - Julian) 「變更長條圖」面板
const EditBarPanel: FC<IBasePanelProps> = ({
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const categories = parsedXYChartData.xAxis.categories || [];
  const barSeries = parsedXYChartData.series.filter(
    (s) => s.type === XYChartDataType.BAR,
  );

  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [nameInput, setNameInput] = useState<string>(
    barSeries[targetIndex].seriesName,
  );
  const [dataType, setDataType] = useState<XYChartDataType>(
    XYChartDataType.BAR,
  );
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [rawValues, setRawValues] = useState<string>("");

  useEffect(() => {
    const selectedSeries = barSeries[targetIndex];
    if (selectedSeries) {
      if (categories.length > 0) {
        const initialVals = categories.map((_, i) =>
          String(selectedSeries.data[i] ?? ""),
        );
        setCategoryValues(initialVals);
      } else {
        setRawValues(selectedSeries.data.join(", "));
      }
    } else {
      if (categories.length > 0) {
        setCategoryValues(categories.map(() => ""));
      } else {
        setRawValues("");
      }
    }
  }, [targetIndex, parsedXYChartData]);

  const handleSubmit = () => {
    const data =
      categories.length > 0
        ? categoryValues
            .map((v) => parseFloat(v))
            .map((n) => (isNaN(n) ? 0 : n))
        : rawValues
            .split(",")
            .map((v) => parseFloat(v.trim()))
            .filter((n) => !isNaN(n));

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_CHANGE_BAR_SERIES,
      description: `變更長條圖數值 (數列 #${targetIndex + 1})`,
      payload: {
        seriesIndex: targetIndex,
        type: dataType,
        data,
        seriesName: nameInput,
      },
    });
  };

  const handleCategoryValueChange = (idx: number, val: string) => {
    setCategoryValues((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  if (barSeries.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        {t("此圖表目前無長條圖數據")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <ChartColumnBig size={14} />
        <p>{t("變更長條圖")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={MERMAID_LABEL_STYLE}>{t("數列類型")}</label>
          <SegmentedControl
            value={dataType}
            onChange={(val) => setDataType(val as XYChartDataType)}
            options={[
              { label: t("長條圖"), value: XYChartDataType.BAR },
              { label: t("折線圖"), value: XYChartDataType.LINE },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="barNameInput" className={MERMAID_LABEL_STYLE}>
          {t("數列名稱")}
        </label>
        <input
          id="barNameInput"
          type="text"
          className={MERMAID_INPUT_STYLE}
          value={nameInput}
          placeholder={t("請輸入數列名稱，例如：數列 A...也可省略")}
          onChange={(e) => setNameInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        {barSeries.length > 1 && (
          <div className="flex flex-col">
            <label htmlFor="barTarget" className={MERMAID_LABEL_STYLE}>
              {t("選擇欲修改的長條圖數列")}
            </label>
            <select
              id="barTarget"
              value={targetIndex}
              onChange={(e) => setTargetIndex(Number(e.target.value))}
              className={MERMAID_INPUT_STYLE}
            >
              {barSeries.map((s) => (
                <option key={`bar-opt-${s.lineIndex}`} value={s.lineIndex}>
                  {`長條圖數列 #${s.lineIndex + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {categories.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label className={MERMAID_LABEL_STYLE}>
              {t("輸入各分類對應數值")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat, idx) => (
                <div key={`bar-cat-val-${idx}`} className="flex flex-col">
                  <span className="truncate text-[10px] font-bold text-slate-400">
                    {cat}
                  </span>
                  <input
                    type="number"
                    value={categoryValues[idx] ?? ""}
                    onChange={(e) =>
                      handleCategoryValueChange(idx, e.target.value)
                    }
                    className={MERMAID_INPUT_STYLE}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <label htmlFor="barRawValues" className={MERMAID_LABEL_STYLE}>
              {t("數值 (以逗號分隔)")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="barRawValues"
              type="text"
              value={rawValues}
              onChange={(e) => setRawValues(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder="e.g. 10, 20, 30"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260709 - Julian) 「刪除數列」面板
const DeleteSeriesPanel: FC<IBasePanelProps> = ({
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { series } = parsedXYChartData;
  const seriesIds = series.map((s) => s.lineIndex);

  const [selectedSeries, setSelectedSeries] = useState<number>(seriesIds[0]);

  const handleSubmit = () => {
    const payload: { seriesIndex: number } = { seriesIndex: selectedSeries };
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.XYCHART_DELETE_SERIES,
      description: `刪除數列 #${selectedSeries}`,
      payload,
    });
  };

  const seriesOptions = series.map((s, idx) => {
    const dataType =
      s.type === XYChartDataType.LINE ? t("折線圖數列") : t("長條圖數列");
    return (
      <option key={idx} value={s.lineIndex}>
        {`${dataType} #${s.lineIndex} (${s.data})`}
      </option>
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <FilePlus size={14} />
        <p>{t("刪除數列")}</p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="seriesSelect" className={MERMAID_LABEL_STYLE}>
          {t("選擇要刪除的數列")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="seriesSelect"
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(Number(e.target.value))}
          className={MERMAID_INPUT_STYLE}
        >
          {seriesOptions}
        </select>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("刪除數列")}
      </button>
    </div>
  );
};

// ==========================================
// Info: (20260707 - Julian) 工具面板元件映射表
// ==========================================

const XY_CHART_TOOL_PANELS: Record<XYChartTools, FC<IBasePanelProps>> = {
  [XYChartTools.ADD_SERIES]: AddSeriesPanel,
  [XYChartTools.CHANGE_X_AXIS_VALUES]: EditXAxisPanel,
  [XYChartTools.CHANGE_Y_AXIS_VALUES]: EditYAxisPanel,
  [XYChartTools.CHANGE_BAR_VALUES]: EditBarPanel,
  [XYChartTools.CHANGE_LINE_VALUES]: EditLinePanel,
  [XYChartTools.DELETE_SERIES]: DeleteSeriesPanel,
};

// ==========================================
// Info: (20260707 - Julian) 主元件
// ==========================================

interface IXYChartToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedXYChartData: IXYChartData | null;
  onAddAction: (action: IChartAction) => void;
}

export const XYChartToolsSection: FC<IXYChartToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedXYChartData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const handleAddActionWithReset = (action: IChartAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isGanttToolSelected = Object.values(XYChartTools).includes(
    selectedTool as XYChartTools,
  );

  const ActivePanel = isGanttToolSelected
    ? XY_CHART_TOOL_PANELS[selectedTool as XYChartTools]
    : null;

  return (
    <>
      {/* Info: (20260707 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {XY_CHART_TOOLS.map((item) => {
          const handleClick = () =>
            setSelectedTool(selectedTool === item.tool ? null : item.tool);

          return (
            <button
              key={item.tool}
              type="button"
              onClick={handleClick}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                selectedTool === item.tool
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon size={14} className="shrink-0" />
              <p>{t(XY_CHART_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {/* Info: (20260707 - Julian) 快捷工具子面板 - 透過 Mapping 動態載入 */}
      {ActivePanel && parsedXYChartData && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedXYChartData={parsedXYChartData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
