import { Dispatch, SetStateAction } from 'react';

interface SimpleToggleProps {
  isOn: boolean;
  setIsOn: Dispatch<SetStateAction<boolean>>;
}

const SimpleToggle = ({ isOn, setIsOn }: SimpleToggleProps) => {
  const toggleButton = () => {
    setIsOn((prev) => !prev);

    // ToDo: (20241230 - Liz) 打 API 更新資料
  };

  return (
    <button
      type="button"
      onClick={toggleButton}
      className={`flex w-50px items-center rounded-full p-2px ${isOn ? 'justify-end bg-switch-surface-active' : 'justify-start bg-switch-surface-base'}`}
    >
      <span className="h-24px w-24px rounded-full bg-switch-surface-controller"></span>
    </button>
  );
};

export default SimpleToggle;
