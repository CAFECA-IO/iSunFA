import React from 'react';
import { useTranslation } from 'next-i18next';
import { FaCircleCheck } from 'react-icons/fa6';
import { useCalculatorCtx } from '@/contexts/calculator_context';

const StepTabs: React.FC = () => {
  const { t } = useTranslation('calculator');
  const { currentStep, completeSteps, switchStep } = useCalculatorCtx();
  const steps = [
    t('calculator:TABS.BASIC_INFO'),
    t('calculator:TABS.BASE_PAY'),
    t('calculator:TABS.WORK_HOURS'),
    t('calculator:TABS.OTHERS'),
  ];

  const tabs = steps.map((step, index) => {
    const isActive = currentStep === index + 1;
    // Info: (20250710 - Julian) 檢查 completeSteps 是否包含當前步驟
    const isCompleted = completeSteps.some((s) => s.step === index + 1 && s.completed);
    const clickHandler = () => {
      switchStep(index + 1);
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
        className={`${stepClass} flex h-40px w-full items-center justify-center gap-8px rounded-sm border px-12px py-8px text-xs font-medium`}
      >
        <FaCircleCheck size={20} className={iconClass} />
        {step}
      </button>
    );
  });

  return <div className="flex items-center gap-8px">{tabs}</div>;
};

export default StepTabs;
