import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { IoWarningOutline, IoPauseCircleOutline } from 'react-icons/io5';
import { HiOutlineSparkles } from 'react-icons/hi';
import { GrRefresh } from 'react-icons/gr';

export enum AIState {
  RESTING = 'resting',
  WORKING = 'working',
  FINISH = 'finish',
  FAILED = 'failed',
}

interface AIWorkingAreaProps {
  aiState: AIState;
  setAiState: (state: AIState) => void;
  analyzeSuccess: boolean;
  setIsShowAnalysisPreview: (isShow: boolean) => void;
  fillUpClickHandler: () => void;
}

const AIWorkingArea: React.FC<AIWorkingAreaProps> = ({
  aiState,
  setAiState,
  analyzeSuccess,
  setIsShowAnalysisPreview,
  fillUpClickHandler,
}) => {
  const { t } = useTranslation('common');

  const gifSrc =
    aiState === AIState.RESTING ? '/animations/ai_resting.gif' : '/animations/ai_working.gif';

  const displayedAIStateStr =
    aiState === AIState.RESTING ? (
      // Info: (20241017 - Julian) AI Resting
      <p className="font-medium text-text-neutral-primary">
        {t('journal:AI_WORKING_AREA.RESTING_CONTENT')}
      </p>
    ) : aiState === AIState.WORKING ? (
      // Info: (20241017 - Julian) AI Working
      <div className="flex items-center font-medium text-text-neutral-primary">
        <p>{t('journal:AI_WORKING_AREA.WORKING_CONTENT')}</p>
        <button
          type="button"
          className="flex items-center gap-4px px-16px py-8px text-sm text-button-text-primary hover:text-button-text-primary-hover"
          onClick={() => setAiState(AIState.RESTING)}
        >
          <IoPauseCircleOutline size={20} />
          <p>{t('journal:AI_WORKING_AREA.STOP_BTN')}</p>
        </button>
      </div>
    ) : aiState === AIState.FAILED ? (
      <div className="flex items-center gap-16px font-medium text-text-neutral-primary">
        <p>{t('journal:AI_WORKING_AREA.FAILED_CONTENT')}</p>
        <button
          type="button"
          className="flex items-center gap-4px px-16px py-8px text-sm text-button-text-primary hover:text-button-text-primary-hover"
        >
          <GrRefresh size={20} className="scale-x-flip" />
          <p>{t('journal:AI_WORKING_AREA.RETRY_BTN')}</p>
        </button>
      </div>
    ) : analyzeSuccess && AIState.FINISH ? (
      <div className="flex items-center gap-16px font-medium text-text-neutral-primary">
        <p>{t('journal:AI_WORKING_AREA.FINISH_CONTENT')}</p>
        <button
          type="button"
          className="flex items-center gap-4px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-16px py-8px text-sm text-button-text-primary-solid hover:border-button-stroke-primary-hover hover:bg-button-surface-soft-primary-hover"
          onMouseEnter={() => setIsShowAnalysisPreview(true)}
          onMouseLeave={() => setIsShowAnalysisPreview(false)}
          onClick={fillUpClickHandler}
        >
          <HiOutlineSparkles size={16} />
          <p>{t('journal:AI_WORKING_AREA.FILL_UP_BTN')}</p>
        </button>
      </div>
    ) : null;

  const displayedWarningStr =
    analyzeSuccess && aiState === AIState.FINISH ? (
      <div className="flex items-center gap-4px text-text-neutral-tertiary">
        <IoWarningOutline size={16} />
        <p className="text-xs">{t('journal:AI_WORKING_AREA.WARNING_CONTENT')}</p>
      </div>
    ) : null;

  return (
    <div className="sticky top-0 z-60 flex w-full items-center justify-between rounded-md bg-surface-neutral-surface-lv2 pr-26px text-lg shadow-Dropshadow_S">
      {/* Info: (20241017 - Julian) AI GIF */}
      <div>
        <Image src={gifSrc} alt="AI Analyze" width={160} height={120} />
      </div>

      {/* Info: (20241017 - Julian) AI State */}
      <div className="flex flex-col items-end gap-12px">
        {displayedAIStateStr}
        {displayedWarningStr}
      </div>
    </div>
  );
};

export default AIWorkingArea;
