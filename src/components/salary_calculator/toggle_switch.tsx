import React from "react";

interface IToggleSwitchProps {
  isOn: boolean;
  handleToggle: () => void;
  title?: string;
}

const ToggleSwitch: React.FC<IToggleSwitchProps> = ({
  isOn,
  handleToggle,
  title,
}) => {
  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex items-center gap-3 group relative hover:cursor-pointer"
    >
      {/* Info: (20250806 - Julian) Toggle Switch */}
      <div
        className={`group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${isOn ? "bg-orange-400" : "bg-gray-200"}`}
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
