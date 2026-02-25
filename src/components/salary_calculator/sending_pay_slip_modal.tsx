import React, { useState } from "react";
import { Mail, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useCalculatorCtx } from "@/contexts/calculator_context";

const SendingPaySlipModal: React.FC<{ modalVisibleHandler: () => void }> = ({
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();
  const { employeeName, employeeEmail, selectedMonth } = useCalculatorCtx();

  const monthName = selectedMonth.name;
  const monthWithI18n = t(
    `date:month_name.${monthName.toLowerCase().slice(0, 3)}`,
  );

  const [emailInput, setEmailInput] = useState<string>(employeeEmail);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);

  const changeEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    // Info: (20250723 - Julian) 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValidEmail(emailRegex.test(e.target.value));
  };

  const sendPaySlip = () => {
    // ToDo: (20250723 - Julian) 實作發送薪資單的邏輯

    console.log("Sending pay slip to:", emailInput);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-[90vw] flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-fit">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-10 py-4">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t("calculator.sending_pay_slip_modal.title")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-5"
          >
            <X size={24} />
          </button>
        </div>
        {/* Info: (20250723 - Julian) Modal Content */}
        <div className="flex flex-col gap-2.5 px-5 py-2">
          <p className="text-sm font-normal text-card-text-secondary">
            {t("calculator.sending_pay_slip_modal.content_1")}
            <span className="font-semibold">
              {/* Info: (20250723 - Julian) 匯入月份 */}
              {t("calculator.sending_pay_slip_modal.content_bold_1", {
                month: monthWithI18n,
              })}
            </span>
            {t("calculator.sending_pay_slip_modal.content_2")}
            <span className="font-semibold">
              {/* Info: (20250723 - Julian) 匯入員工姓名 */}
              {t("calculator.sending_pay_slip_modal.content_bold_2", {
                employeeName,
              })}
            </span>
          </p>
          <div
            className={`flex items-center divide-x rounded-sm border bg-input-surface-input-background ${isValidEmail ? "divide-input-stroke-input border-input-stroke-input" : "divide-input-stroke-error border-input-stroke-error"}`}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Mail
                size={16}
                className={`${isValidEmail ? "text-icon-surface-single-color-primary" : "text-text-state-error"}`}
              />
              <p
                className={`font-medium ${isValidEmail ? "text-input-text-input-placeholder" : "text-input-text-error"}`}
              >
                {t("calculator.sending_pay_slip_modal.email")}
              </p>
            </div>
            <input
              type="text"
              value={emailInput}
              onChange={changeEmailInput}
              placeholder={t(
                "calculator.sending_pay_slip_modal.email_placeholder",
              )}
              className={`flex-1 bg-transparent px-3 py-2.5 font-medium outline-none ${isValidEmail ? "placeholder:text-input-text-input-placeholder" : "text-input-text-error"}`}
            />
          </div>
          {/* Info: (20250723 - Julian) Invalid Email Message */}
          {!isValidEmail && (
            <div className="text-right text-sm font-medium text-text-state-error">
              {t("calculator.sending_pay_slip_modal.invalid_email_hint")}
            </div>
          )}
        </div>
        {/* Info: (20250723 - Julian) Buttons */}
        <div className="grid grid-cols-2 gap-3 px-5 py-4">
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
            disabled={!isValidEmail || emailInput.trim() === ""}
            onClick={sendPaySlip}
          >
            {t("calculator.sending_pay_slip_modal.submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendingPaySlipModal;
