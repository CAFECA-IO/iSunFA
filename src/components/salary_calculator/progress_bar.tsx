"use client";

import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { X, RefreshCw } from "lucide-react";

const ProgressBar: React.FC = () => {
  const { t } = useTranslation();
  const { completeSteps, resetFormHandler } = useCalculatorCtx();
  const [isShowModal, setIsShowModal] = useState<boolean>(false);

  // Info: (20250709 - Julian) 總共四個步驟，每個步驟佔 25% 的進度
  const progress = completeSteps.reduce((acc, step) => {
    return acc + (step.completed ? 25 : 0);
  }, 0);

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);
  const resetClickHandler = () => {
    resetFormHandler();
    modalVisibleHandler();
  };

  return (
    <>
      <div className="flex w-full items-end gap-12px">
        <div className="flex flex-1 flex-col items-start gap-8px">
          <p className="text-base font-semibold text-text-state-success">
            {t("calculator.tabs.completed")} {progress}%
          </p>
          <div className="relative h-8px w-full rounded-full bg-progress-bar-surface-base">
            <span
              className="absolute h-8px rounded-full bg-surface-state-success"
              style={{
                width: `${progress}%`,
                transition: "width 0.3s ease-in-out",
              }}
            ></span>
          </div>
        </div>

        <button type="button" onClick={modalVisibleHandler}>
          <RefreshCw size={16} className="-scale-x-100" />{" "}
          {t("calculator.button.reset")}
        </button>
      </div>

      {/* Info: (20250723 - Julian) 重置提示 Modal */}
      {isShowModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
          <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-fit">
            {/* Info: (20250723 - Julian) Modal Header */}
            <div className="relative flex items-start justify-center px-40px py-16px">
              <h2 className="text-lg font-bold text-card-text-primary">
                {t("calculator.reset_modal.title")}
              </h2>
              <button
                type="button"
                onClick={modalVisibleHandler}
                className="absolute right-20px"
              >
                <X size={24} />
              </button>
            </div>
            {/* Info: (20250723 - Julian) Modal Content */}
            <div className="px-20px py-8px text-sm font-normal text-card-text-secondary">
              {t("calculator.reset_modal.content")}
            </div>
            {/* Info: (20250723 - Julian) buttons */}
            <div className="grid grid-cols-2 gap-12px px-20px py-16px">
              <button
                type="button"
                className="w-full"
                onClick={modalVisibleHandler}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="w-full"
                onClick={resetClickHandler}
              >
                {t("calculator.reset_modal.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProgressBar;
