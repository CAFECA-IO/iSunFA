import { FC } from "react";
import { MERMAID_TOGGLE_BUTTON_STYLE } from "@/constants/mermaid_chart";

/**
 * Info: (20260707 - Julian) 元件分段切換按鈕 (例如: 指定日期 vs 跟隨前置)
 */
export const SegmentedControl: FC<{
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ options, value, onChange, disabled = false }) => (
  <div className={MERMAID_TOGGLE_BUTTON_STYLE.container}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        disabled={disabled}
        onClick={() => onChange(opt.value)}
        className={`${MERMAID_TOGGLE_BUTTON_STYLE.button} ${
          value === opt.value
            ? MERMAID_TOGGLE_BUTTON_STYLE.active
            : MERMAID_TOGGLE_BUTTON_STYLE.inactive
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
