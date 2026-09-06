import { FC } from "react";

interface IToggleSwitchProps {
  isOn: boolean;
  handleToggle: () => void;
  title?: string;
  /**
   * Info: (20260902 - Julian) 停用時仍然顯示狀態，只是不能按。
   *
   * 用在「值的來源在別的地方」的情況（例如到職日連結員工後由員工檔決定）——
   * 那時候把整個開關藏起來會讓使用者看不出「這個月有沒有中途到職」，
   * 而那是影響金額的資訊。
   */
  disabled?: boolean;
}

const ToggleSwitch: FC<IToggleSwitchProps> = ({
  isOn,
  handleToggle,
  title = undefined,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className="group relative flex items-center gap-3 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Info: (20250806 - Julian) Toggle Switch */}
      <div
        className={`group relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${isOn ? "bg-orange-400" : "bg-gray-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"}`}
        />
      </div>
      {/* Info: (20250806 - Julian) Title */}
      {title && <p className="text-sm font-semibold text-gray-700">{title}</p>}
    </button>
  );
};

export default ToggleSwitch;
