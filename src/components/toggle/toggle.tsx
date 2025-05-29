import React, { Dispatch, SetStateAction, useState } from 'react';

interface IToggleProps {
  id: string;
  lockedToOpen?: boolean;
  initialToggleState?: boolean;
  getToggledState: (props: boolean) => void;
  toggleStateFromParent?: boolean;
  setToggleStateFromParent?: Dispatch<SetStateAction<boolean>>;
  label?: string; // Info: (20250528 - Julian) 文字
  labelClassName?: string; // Info: (20250528 - Julian) 文字樣式
}

const Toggle = ({
  id,
  initialToggleState = false,
  getToggledState,
  lockedToOpen = false,
  toggleStateFromParent = false,
  setToggleStateFromParent = () => {},
  label,
  labelClassName = '',
}: IToggleProps) => {
  const [internalToggle, setInternalToggle] = useState(initialToggleState);
  const toggle = toggleStateFromParent !== undefined ? toggleStateFromParent : internalToggle;
  const setToggle =
    setToggleStateFromParent !== undefined ? setToggleStateFromParent : setInternalToggle;

  const passToggledStateHandler = (data: boolean) => {
    getToggledState(data);
  };

  const toggleClickHandler = () => {
    if (lockedToOpen) return;
    setToggle(!toggle);
    passToggledStateHandler(!toggle);
  };

  const toggleBackgroundStyle = lockedToOpen
    ? 'bg-switch-surface-base'
    : toggle
      ? 'bg-switch-surface-active'
      : 'bg-switch-surface-base';

  const toggleSwitchStyle = lockedToOpen
    ? 'transform translate-x-full shadow-lg shadow-black/80'
    : toggle
      ? 'transform translate-x-full'
      : '';

  return (
    <div onClick={toggleClickHandler} className="flex w-fit items-center gap-lv-2 tablet:gap-16px">
      <div
        id={id}
        className={`${toggleBackgroundStyle} inline-flex h-26px w-46px cursor-pointer items-center rounded-full p-3px duration-300 ease-in-out hover:cursor-pointer`}
      >
        <div
          className={`${toggleSwitchStyle} h-20px w-20px rounded-full bg-switch-surface-controller shadow-md duration-300 ease-in-out`}
        ></div>
      </div>

      {label && <p className={`${labelClassName} hover:cursor-pointer`}>{label}</p>}
    </div>
  );
};

export default Toggle;
