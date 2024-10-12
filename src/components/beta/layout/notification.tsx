import { FiBell } from 'react-icons/fi';
import useOuterClick from '@/lib/hooks/use_outer_click'; // Info: (20241011 - Liz) 加上這個 hook 讓使用者點擊外部時可以關閉選單

const Notification = () => {
  const {
    targetRef: notificationRef,
    componentVisible: isPanelOpen, // Info: (20241011 - Liz) 這個變數是用來判斷訊息面板是否開啟
    setComponentVisible: setIsPanelOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const TogglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  return (
    <section className="relative" ref={notificationRef}>
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
        <div className="absolute right-0 top-full z-10 w-400px translate-y-6 rounded-lg bg-surface-neutral-surface-lv2 px-24px py-12px shadow-Dropshadow_M">
          <p className="p-16px font-medium text-text-neutral-primary">
            Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum
            quibusdam quos voluptatem......
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum
            quibusdam quos voluptatem......
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum
            quibusdam quos voluptatem......
          </p>
          <p className="p-16px font-medium text-text-neutral-tertiary">
            Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum
            quibusdam quos voluptatem......
          </p>
        </div>
      )}
    </section>
  );
};

export default Notification;
