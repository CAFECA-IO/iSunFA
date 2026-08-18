"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import { HR_FORM_SHEET_MEDIA_QUERY } from "@/constants/hr_management";
import { useScrollLock } from "@/hooks/use_scroll_lock";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 同一份表單，兩種版型：桌機內嵌卡片、手機由下方彈出。
 *
 * ## 只有一個實例
 *
 * 用 CSS 換位置，不是寫兩份 —— 兩份意味著兩套 `<input>`、兩個要同步的 DOM，
 * 以及日後只改到其中一份的機會（同 `hr_sidebar.tsx` 只寫一份 `navList` 的理由）。
 * `lg:` 那一串把 fixed / absolute / 圓角 / 陰影全部收回內嵌卡片的樣子，
 * 因此桌機完全不受 `open` 影響：關著是內嵌卡片，開著也還是內嵌卡片。
 *
 * ## 為什麼斷點在 JS 端有一份副本
 *
 * 這是唯一非 CSS 能解的部分：`useScrollLock` 與 `role="dialog"` 不看螢幕寬度。
 * 只靠 `lg:hidden` 的話，桌機開啟時會被鎖住捲動、而畫面上沒有任何遮罩
 * 說明為什麼捲不動。
 *
 * Info: (20260818 - Julian) 從 `my_leave_page_body` 抽出來 —— 加班頁是第二個
 * 需要它的地方，而第二次就該抽了。
 */
const HrFormSheet: FC<{
  /** Info: (20260818 - Julian) 只影響手機版；桌機一律內嵌顯示 */
  open: boolean;
  onClose: () => void;
  title: string;
  /** Info: (20260818 - Julian) 標題左側的圖示，由呼叫端決定 */
  icon?: ReactNode;
  children: ReactNode;
}> = ({ open, onClose, title, icon = null, children }) => {
  const { t } = useTranslation();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(HR_FORM_SHEET_MEDIA_QUERY);
    const sync = () => setIsCompact(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Info: (20260818 - Julian) 只有真的以抽屜呈現時，它才是一層 modal
  const asSheet = open && isCompact;

  useScrollLock(asSheet);

  /**
   * Info: (20260818 - Julian) Esc 關閉。手機上少用，但接了鍵盤的平板與
   * 桌機縮窄視窗都會走到這裡，而一個關不掉的遮罩是死路。
   */
  useEffect(() => {
    if (!asSheet) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [asSheet, onClose]);

  return (
    <div
      className={
        open ? "fixed inset-0 z-40 lg:static lg:z-auto" : "hidden lg:block"
      }
    >
      {open && (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="absolute inset-0 h-full w-full bg-gray-900/40 lg:hidden"
        />
      )}

      <section
        role={asSheet ? "dialog" : undefined}
        aria-modal={asSheet ? true : undefined}
        aria-label={asSheet ? title : undefined}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-xl lg:static lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:pb-4 lg:shadow-none lg:ring-1 lg:ring-gray-200"
      >
        {/* Info: (20260818 - Julian) 抓握條：說明「這是蓋在上面的一層」，可以撥掉 */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 lg:hidden" />

        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            {icon}
            {title}
          </h2>

          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-gray-400 transition hover:text-gray-600 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
};

export default HrFormSheet;
