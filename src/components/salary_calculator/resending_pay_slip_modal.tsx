"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import { X } from "lucide-react";
// import { useModalContext } from '@/contexts/modal_context';
// import { MessageType } from '@/interfaces/message_modal';

interface IResendingPaySlipModalProps {
  monthName: string;
  sentToName: string;
  modalVisibleHandler: () => void;
}

const ResendingPaySlipModal: React.FC<IResendingPaySlipModalProps> = ({
  monthName,
  sentToName,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  // ToDo: (20260224 - Julian) =========== 這邊要實作 Modal
  // const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  useEffect(() => {
    if (resendSuccess) {
      // Info: (20250725 - Julian) 顯示訊息 Modal
      // messageModalDataHandler({
      //   messageType: MessageType.SUCCESS,
      //   title: t('calculator.MESSAGE.RESEND_SUCCESS_TITLE'),
      //   content: t('calculator.MESSAGE.RESEND_SUCCESS_CONTENT'),
      //   submitBtnStr: t('common:COMMON.CLOSE'),
      //   submitBtnFunction: messageModalVisibilityHandler,
      // });
      // messageModalVisibilityHandler();
      // // Info: (20250725 - Julian) 關閉 Modal
      // modalVisibleHandler();
    }
  }, [resendSuccess]);

  const resendPaySlip = () => {
    // ToDo: (20250725 - Julian) 重置薪資單功能

    console.log("Reset Pay Slip");

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setResendSuccess(true);
    }, 3000); // Info: (20250725 - Julian) 模擬延遲
  };

  const modalContent = isSending ? (
    <div className="flex flex-1 items-center justify-center">
      <Image
        src="/animations/yellow_loading.gif"
        width={32}
        height={32}
        alt="loading"
      />
    </div>
  ) : (
    <>
      {/* Info: (20250723 - Julian) Modal Content */}
      <div className="px-5 py-2 text-card-text-secondary">
        {t("calculator.MESSAGE.RESEND_PAY_SLIP_CONTENT_1")}
        <span className="font-bold">
          {t("calculator.MESSAGE.RESEND_PAY_SLIP_CONTENT_BOLD_1", {
            month: monthName,
          })}
        </span>
        {t("calculator.MESSAGE.RESEND_PAY_SLIP_CONTENT_2")}
        <span className="font-bold">
          {t("calculator.MESSAGE.RESEND_PAY_SLIP_CONTENT_BOLD_2", {
            name: sentToName,
          })}
        </span>
        {t("calculator.MESSAGE.RESEND_PAY_SLIP_CONTENT_3")}
      </div>
      {/* Info: (20250723 - Julian) Buttons */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <button type="button" className="w-full" onClick={modalVisibleHandler}>
          {t("calculator.MESSAGE.RESEND_PAY_SLIP_CANCEL_BTN")}
        </button>
        <button type="button" className="w-full" onClick={resendPaySlip}>
          {t("calculator.MESSAGE.RESEND_PAY_SLIP_SUBMIT_BTN")}
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex min-h-[200px] w-[90vw] flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-[350px]">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-10 py-4">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t("calculator.MESSAGE.RESEND_PAY_SLIP_TITLE")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-5"
          >
            <X scale={24} />
          </button>
        </div>
        {modalContent}
      </div>
    </div>
  );
};

export default ResendingPaySlipModal;
