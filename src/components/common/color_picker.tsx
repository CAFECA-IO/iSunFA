"use client";

import { FC } from "react";

// Info: (20260722 - Julian) 預設為白色
const INITIAL_COLOR_HEX = "#FFFFFF";

interface IColorPickerProps {
  colorOptions: string[];
  value: string;
  onChange: (hex: string) => void;
}

// Info: (20260722 - Julian)
// 簡易選色盤：預設調色盤色票 + 原生色票輸入供自訂 HEX。
// 受控元件，value 為目前 HEX（空字串代表尚未選色），onChange 回傳選定 HEX。
const ColorPicker: FC<IColorPickerProps> = ({
  colorOptions,
  value,
  onChange,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {colorOptions.map((color) => (
      <button
        key={`swatch-${color}`}
        type="button"
        aria-label={color}
        onClick={() => onChange(color)}
        className={`size-7 rounded-md border-2 transition ${
          value.toLowerCase() === color.toLowerCase()
            ? "border-slate-800"
            : "border-transparent hover:border-slate-300"
        }`}
        style={{ backgroundColor: color }}
      />
    ))}
    {/* Info: (20260721 - Julian) 自訂顏色：原生色票 input（回傳小寫 HEX） */}
    <span
      className="relative block size-7 shrink-0 overflow-hidden rounded-md border-2 border-dashed border-slate-300"
      title="自訂顏色"
    >
      <input
        type="color"
        aria-label="自訂顏色"
        value={value || INITIAL_COLOR_HEX}
        onChange={(e) => onChange(e.target.value)}
        className="absolute h-full w-full scale-200 cursor-pointer"
      />
    </span>
  </div>
);

export default ColorPicker;
