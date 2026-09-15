"use client";

import { FC } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface ILeaveWithoutSavingModalProps {
  stayHandler: () => void;
  leaveHandler: () => void;
}

/**
 * Info: (20260914 - Julian) 「改了還沒存，確定要離開嗎」。
 *
 * ## 為什麼預設的動作是「留下」
 *
 * 兩顆鈕的分量刻意不對等：**留下**是實心的主要按鈕，離開是文字鈕。
 * 這個對話框是使用者沒有預期的（他以為自己只是點了一個連結），
 * 而沒有預期的對話框常常被下意識地點掉最近的那一顆 ——
 * 那一顆該是回得來的那個選項。離開之後那些字就沒了。
 *
 * 沿用 `delete_record_modal.tsx` 的形狀（`src/contexts/modal_context`
 * 已不存在，這一系列的確認都是自己畫的）。
 *
 * ## 沒有 X
 *
 * 這裡只有兩個結果：走或不走。多一顆 X 的話它的語意是「不走」——
 * 與「留在此頁」重複，而重複的出口只會讓人多想一秒。
 */
const LeaveWithoutSavingModal: FC<ILeaveWithoutSavingModalProps> = ({
  stayHandler,
  leaveHandler,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[450px]">
        <div className="flex items-center justify-center gap-3 px-[40px] py-[16px]">
          <TriangleAlert size={20} className="shrink-0 text-orange-600" />
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.company_setting.leave_title")}
          </h2>
        </div>

        <div className="px-[40px] pb-[24px]">
          <p className="text-text-neutral-primary text-sm leading-relaxed">
            {t("calculator.company_setting.leave_content")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-[12px] px-[40px] pb-[24px]">
          <button
            type="button"
            onClick={leaveHandler}
            className="text-text-neutral-secondary h-[40px] px-[18px] text-sm font-semibold"
          >
            {t("calculator.company_setting.leave_discard")}
          </button>
          <button
            type="button"
            onClick={stayHandler}
            className="h-[40px] rounded-lg bg-orange-600 px-[20px] text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            {t("calculator.company_setting.leave_stay")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveWithoutSavingModal;
