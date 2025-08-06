import React from 'react';

interface IToggleSwitchProps {
  isOn: boolean;
  handleToggle: () => void;
  title?: string;
}

const ToggleSwitch: React.FC<IToggleSwitchProps> = ({ isOn, handleToggle, title }) => {
  return (
    <div className="flex items-center gap-16px">
      {/* Info: (20250806 - Julian) Toggle Switch */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative w-66px rounded-full p-2px transition-all duration-300 ease-in-out ${isOn ? 'bg-switch-surface-active' : 'bg-switch-surface-base'}`}
      >
        <div
          className={`h-32px w-32px rounded-full bg-switch-surface-controller shadow-switch-controller transition-all duration-300 ease-in-out ${isOn ? 'translate-x-30px' : 'translate-x-0'}`}
        ></div>
      </button>
      {/* Info: (20250806 - Julian) Title */}
      {title && <p className="text-base font-medium text-switch-text-primary">{title}</p>}
    </div>
  );
};

export default ToggleSwitch;
