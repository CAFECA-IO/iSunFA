import React from 'react';
import { useTranslation } from 'next-i18next';
import { FaCircleCheck } from 'react-icons/fa6';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { getMinimumWage } from '@/lib/utils/salary_calculator';

const StepTabs: React.FC = () => {
  const { t } = useTranslation(['calculator', 'common']);
  const steps = [
    t('calculator:TABS.BASIC_INFO'),
    t('calculator:TABS.BASE_PAY'),
    t('calculator:TABS.WORK_HOURS'),
    t('calculator:TABS.OTHERS'),
  ];

  const {
    currentStep,
    completeSteps,
    switchStep,
    employeeName,
    baseSalary,
    mealAllowance,
    otherAllowanceWithTax,
    otherAllowanceWithoutTax,
    setIsNameError,
  } = useCalculatorCtx();
  const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();

  // Info: (20251002 - Julian) 取得當前年份的最低基本薪資
  const thisYear = new Date().getFullYear();
  const minBasicSalary = getMinimumWage(thisYear);

  // Info: (20251002 - Julian) 本薪（應稅）＋伙食費（免稅）＋其他加給（應稅）＋其他加給（免稅）應大於等於最低基本薪資
  const wage = baseSalary + mealAllowance + otherAllowanceWithTax + otherAllowanceWithoutTax;
  const isWageError = wage < minBasicSalary;

  const tabs = steps.map((step, index) => {
    const isActive = currentStep === index + 1;
    // Info: (20250710 - Julian) 檢查 completeSteps 是否包含當前步驟
    const isCompleted = completeSteps.some((s) => s.step === index + 1 && s.completed);

    // Info: (20250714 - Julian) 點擊按鈕時的處理函數
    // 第三步（工時）和第四步（其他）沒有特別的檢查條件，所以直接切換到下一步
    const clickHandler = () => {
      switch (currentStep) {
        case 1:
          // Info: (20250714 - Julian) 第一步（基本資訊）的檢查條件
          if (employeeName === '') {
            // Info: (20250714 - Julian) 如果姓名有錯誤，則不允許切換到下一步，且顯示錯誤訊息
            setIsNameError(true);
            messageModalDataHandler({
              messageType: MessageType.ERROR,
              title: t('calculator:MESSAGE.NAME_ERROR_TITLE'),
              content: t('calculator:MESSAGE.NAME_ERROR_CONTENT'),
              submitBtnStr: t('common:COMMON.CLOSE'),
              submitBtnFunction: messageModalVisibilityHandler,
            });
            messageModalVisibilityHandler();
            return;
          }
          // Info: (20250714 - Julian) 如果姓名正確，則切換到下一步
          switchStep(index + 1);
          break;
        case 2:
          // Info: (20250714 - Julian) 第二步（基本薪資）的檢查條件
          if (isWageError) {
            // Info: (20250714 - Julian) 如果薪資小於最小值，則不允許切換到下一步，且顯示錯誤訊息
            messageModalDataHandler({
              messageType: MessageType.ERROR,
              title: t('calculator:MESSAGE.SALARY_ERROR_TITLE'),
              content: t('calculator:MESSAGE.SALARY_ERROR_CONTENT'),
              submitBtnStr: t('common:COMMON.CLOSE'),
              submitBtnFunction: messageModalVisibilityHandler,
            });
            messageModalVisibilityHandler();
            return;
          }
          // Info: (20250714 - Julian) 如果基本薪資正確，則切換到下一步
          switchStep(index + 1);
          break;
        default:
          switchStep(index + 1);
          break;
      }
    };

    const stepClass = isActive
      ? 'border-stroke-state-success bg-surface-state-success-soft text-text-state-success'
      : isCompleted
        ? 'text-text-state-success border-stroke-neutral-tertiary'
        : 'border-stroke-neutral-tertiary text-text-neutral-secondary';

    const iconClass = isActive
      ? ' text-surface-state-success'
      : isCompleted
        ? 'text-surface-state-success-dark'
        : 'text-surface-neutral-mute';

    return (
      <button
        type="button"
        onClick={clickHandler}
        className={`${stepClass} flex h-40px w-full items-center justify-center gap-8px rounded-sm border px-12px py-lv-3 text-xs font-medium tablet:py-8px`}
      >
        <FaCircleCheck size={20} className={iconClass} />
        {step}
      </button>
    );
  });

  return <div className="grid grid-cols-2 gap-8px tablet:grid-cols-4">{tabs}</div>;
};

export default StepTabs;
