import { FiBell } from 'react-icons/fi';

interface NotificationProps {
  isPanelOpen: boolean;
  setIsPanelOpen: (visible: boolean) => void; // Info: (20241213 - Liz) 控制顯示狀態的函數
}

const Notification = ({ isPanelOpen, setIsPanelOpen }: NotificationProps) => {
  const TogglePanel = () => {
    setIsPanelOpen(!isPanelOpen); // Info: (20241213 - Liz) 切換顯示狀態
  };

  return (
    <section className="relative border-2 border-sky-400">
      {/* // Info: (20241011 - Liz) 通知鈴鐺 icon */}
      <button
        type="button"
        onClick={TogglePanel}
        className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        <FiBell size={24} className="cursor-pointer" />
      </button>

      {/* // Info: (20241011 - Liz) 通知訊息面板 */}
      {isPanelOpen && (
        <div className="absolute right-0 top-full z-10 mt-10px w-400px rounded-lg bg-surface-neutral-surface-lv2 px-24px py-12px shadow-Dropshadow_M">
          <p className="p-16px font-medium text-text-neutral-primary">
            This is a test notification, in order to test whether the notification message panel is
            successfully displayed.
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            This is a test notification, in order to test whether the notification message panel is
            successfully displayed.
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            This is a test notification, in order to test whether the notification message panel is
            successfully displayed.
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            This is a test notification, in order to test whether the notification message panel is
            successfully displayed.
          </p>
        </div>
      )}
    </section>
  );
};

export default Notification;
