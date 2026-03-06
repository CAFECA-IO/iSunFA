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
      <div className="flex w-full items-end gap-6">
        <div className="flex flex-1 flex-col items-start gap-2">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs font-bold tracking-widest text-green-600 uppercase">
              {t("calculator.tabs.completed")}
            </p>
            <p className="font-mono text-sm font-black text-gray-900">
              {progress}%
            </p>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="absolute h-full rounded-full bg-linear-to-r from-green-400 to-green-600 shadow-[0_0_8px_rgba(34,197,94,0.4)] transition-all duration-200"
              style={{
                width: `${progress}%`,
                transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            ></div>
          </div>
        </div>

        <button
          type="button"
          onClick={modalVisibleHandler}
          className="group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:text-orange-600"
        >
          <RefreshCw
            size={14}
            className="transition-transform duration-500 group-hover:rotate-180"
          />
          {t("calculator.button.reset")}
        </button>
      </div>

      {/* Info: (20250723 - Julian) 重置提示 Modal */}
      {isShowModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-gray-900/5">
            {/* Info: (20250723 - Julian) Close Button */}
            <button
              type="button"
              onClick={modalVisibleHandler}
              className="absolute top-6 right-6 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {/* Info: (20250723 - Julian) Icon Header */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <RefreshCw size={28} />
            </div>

            {/* Info: (20250723 - Julian) Modal Content */}
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-black text-gray-900">
                {t("calculator.reset_modal.title")}
              </h2>
              <p className="text-sm leading-relaxed font-medium text-gray-500">
                {t("calculator.reset_modal.content")}
              </p>
            </div>

            {/* Info: (20250723 - Julian) buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="flex-1 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-200"
                onClick={modalVisibleHandler}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="flex-2 rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-orange-200 active:scale-95"
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
