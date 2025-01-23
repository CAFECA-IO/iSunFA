interface SimpleToggleProps {
  isOn: boolean;
  onClick: () => void;
}

const SimpleToggle = ({ isOn, onClick }: SimpleToggleProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-50px items-center rounded-full p-2px ${isOn ? 'justify-end bg-switch-surface-active' : 'justify-start bg-switch-surface-base'}`}
    >
      <span className="h-24px w-24px rounded-full bg-switch-surface-controller"></span>
    </button>
  );
};

export default SimpleToggle;
