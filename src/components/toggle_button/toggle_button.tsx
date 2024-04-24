import React from 'react';

interface ToggleButtonProps {
  // Info: (20240424 - Liz) checked, onChange are required. onText, offText default value is empty string.
  onText?: string;
  offText?: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ToggleButton = (props: ToggleButtonProps) => {
  const { onText, offText, checked, onChange } = props;

  const toggleButtonStyle = `relative w-42px h-24px`;

  const knobStyle = `absolute top-0 right-0 bottom-0 left-0 h-20px w-20px flex items-center justify-center text-white shadow-md transition-all duration-100 ease-linear rounded-full z-2 bg-switch-surface-controller`;
  const onStyleForKnob = `top-2px left-20px`;
  const offStyleForKnob = `top-2px left-2px`;

  const layerStyle = `absolute top-0 right-0 bottom-0 left-0 z-1 shadow-md transition-all duration-100 ease-linear rounded-3xl`;
  const onStyleForLayer = `bg-switch-surface-active`;
  const offStyleForLayer = `bg-switch-surface-base`;

  const checkboxStyle = `relative w-full h-full opacity-0 cursor-pointer z-3`;

  return (
    <div className={toggleButtonStyle}>
      <div className={`${layerStyle} ${checked ? onStyleForLayer : offStyleForLayer}`}></div>
      <div className={`${knobStyle} ${checked ? onStyleForKnob : offStyleForKnob}`}>
        {checked ? onText : offText}
      </div>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        className={checkboxStyle}
      />
    </div>
  );
};

ToggleButton.defaultProps = {
  onText: '',
  offText: '',
};

export default ToggleButton;
