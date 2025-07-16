import React from 'react';
import { GrPowerReset } from 'react-icons/gr';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { useCalculatorCtx } from '@/contexts/calculator_context';

const ProgressBar: React.FC = () => {
  const { t } = useTranslation('calculator');
  const { completeSteps, resetFormHandler } = useCalculatorCtx();

  // Info: (20250709 - Julian) 總共四個步驟，每個步驟佔 25% 的進度
  const progress = completeSteps.reduce((acc, step) => {
    return acc + (step.completed ? 25 : 0);
  }, 0);

  return (
    <div className="flex items-end gap-12px">
      <div className="flex flex-col items-start gap-8px">
        <p className="text-base font-semibold text-text-state-success">
          {t('calculator:TABS.COMPLETED')} {progress}%
        </p>
        <div className="relative h-8px w-500px rounded-full bg-progress-bar-surface-base">
          <span
            className="absolute h-8px rounded-full bg-surface-state-success"
            style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}
          ></span>
        </div>
      </div>

      <Button type="button" onClick={resetFormHandler} variant="tertiaryBorderless">
        <GrPowerReset size={16} className="-scale-x-100" /> {t('calculator:BUTTON.RESET')}
      </Button>
    </div>
  );
};

export default ProgressBar;
