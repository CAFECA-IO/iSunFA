import { FC, ReactNode } from "react";
import { Check } from "lucide-react";

interface ICheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode; // Info: (20260721 - Julian) 選填標籤；未給則僅顯示方塊
  disabled?: boolean;
  id?: string;
  className?: string; // Info: (20260721 - Julian) 外層 label 的附加樣式（如 justify-between、w-full）
}

/**
 * Info: (20260721 - Julian)
 * 通用核取方塊：以 appearance-none 自繪，藍色（blue-600）為選取色，
 * 與 iSunFA 工具列／SegmentedControl 一致。
 * 勾號常駐白色，未選取時因白底而隱形、選取時藍底顯現，避免 peer 對後代選取器的限制。
 */
export const Checkbox: FC<ICheckboxProps> = ({
  checked,
  onChange,
  label = undefined,
  disabled = false,
  id = undefined,
  className = "",
}) => (
  <label
    className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-700 ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    } ${className}`}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="peer sr-only"
    />
    <span className="flex size-4 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition-colors peer-checked:border-indigo-400 peer-checked:bg-indigo-400 peer-hover:border-indigo-300 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/40 peer-disabled:border-slate-200 peer-disabled:bg-slate-100">
      <Check size={12} strokeWidth={3} />
    </span>
    {label !== undefined && <span className="select-none">{label}</span>}
  </label>
);
