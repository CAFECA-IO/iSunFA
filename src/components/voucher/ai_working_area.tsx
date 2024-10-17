/* eslint-disable */
import React, { useState } from 'react';
import Image from 'next/image';
import { IoWarningOutline } from 'react-icons/io5';

enum AIState {
  RESTING = 'resting',
  WORKING = 'working',
  FINISH = 'finish',
}

const AIWorkingArea: React.FC = () => {
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  const [analyzeSuccess, setAnalyzeSuccess] = useState<boolean>(false);

  const gifSrc =
    aiState === AIState.RESTING ? '/animations/ai _resting.gif' : '/animations/ai _working.gif';

  const displayedWarningStr = analyzeSuccess ? (
    <div className="flex items-center gap-4px text-text-neutral-tertiary">
      <IoWarningOutline size={16} />
      <p className="text-xs">AI can make mistake, please double check important information.</p>
    </div>
  ) : null;

  return (
    <div className="flex w-full items-center justify-between rounded-md bg-surface-neutral-surface-lv2 pr-26px text-lg shadow-Dropshadow_S">
      {/* Info: (20241017 - Julian) AI GIF */}
      <div>
        <Image src={gifSrc} alt="AI Analyze" width={160} height={120} />
      </div>

      <div className="flex flex-col items-end gap-12px">
        <p className="font-medium text-text-neutral-primary">
          Please select the certificates for AI to generate the voucher for you
        </p>
        {/* Info: (20241017 - Julian) Warning */}
        {displayedWarningStr}
      </div>
    </div>
  );
};

export default AIWorkingArea;
