import React, { useState } from 'react';
import Image from 'next/image';
import { IoWarningOutline, IoPauseCircleOutline } from 'react-icons/io5';
import { HiOutlineSparkles } from 'react-icons/hi';
import { GrRefresh } from 'react-icons/gr';
// import APIHandler from '@/lib/utils/api_handler';
// import { APIName } from '@/constants/api_connection';
// import { ILineItem } from '@/interfaces/line_item';

enum AIState {
  RESTING = 'resting',
  WORKING = 'working',
  FINISH = 'finish',
}

// interface IAIResultVoucher {
//   voucherDate: number;
//   type: string;
//   note: string;
//   counterPartyId: number;
//   lineItemsInfo: {
//     lineItems: ILineItem[];
//   };
// }

const AIWorkingArea: React.FC = () => {
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  const [analyzeSuccess] = useState<boolean>(false);
  const [, /* showPreview */ setShowPreview] = useState<boolean>(false);

  // ToDo: (20241017 - Julian) 施工中 🚧
  /*   const { data: resultData, isLoading } = APIHandler<IAIResultVoucher>(
    APIName.ASK_AI_V2,
    {
      // ToDo: (20241017 - Julian) Replace with real parameters
      params: {
        companyId: '111',
        resultId: '123',
      },
      query: {
        reason: 'voucher',
      },
    },
    true
  ); */

  const gifSrc =
    aiState === AIState.RESTING ? '/animations/ai_resting.gif' : '/animations/ai_working.gif';

  const displayedAIFinishStr = analyzeSuccess ? (
    <div className="flex items-center gap-16px font-medium text-text-neutral-primary">
      <p>AI has done scanning. Click here to allow AI</p>
      <button
        type="button"
        className="flex items-center gap-4px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-16px py-8px text-sm text-button-text-primary-solid hover:border-button-stroke-primary-hover hover:bg-button-surface-soft-primary-hover"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        <HiOutlineSparkles size={16} />
        <p>Fill up your voucher</p>
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-16px font-medium text-text-neutral-primary">
      <p>AI didn’t find any valid data from your certificate, please enter manually or</p>
      <button
        type="button"
        className="flex items-center gap-4px px-16px py-8px text-sm text-button-text-primary hover:text-button-text-primary-hover"
      >
        <GrRefresh size={20} className="scale-x-flip" />
        <p>Try again</p>
      </button>
    </div>
  );

  const displayedAIStateStr =
    aiState === AIState.RESTING ? (
      // Info: (20241017 - Julian) AI Resting
      <p className="font-medium text-text-neutral-primary">
        Please select the certificates for AI to generate the voucher for you
      </p>
    ) : aiState === AIState.WORKING ? (
      // Info: (20241017 - Julian) AI Working
      <div className="flex items-center font-medium text-text-neutral-primary">
        <p>AI is scanning your certificates, please wait...</p>
        <button
          type="button"
          className="flex items-center gap-4px px-16px py-8px text-sm text-button-text-primary hover:text-button-text-primary-hover"
          onClick={() => setAiState(AIState.RESTING)}
        >
          <IoPauseCircleOutline size={20} />
          <p>Stop scanning</p>
        </button>
      </div>
    ) : (
      displayedAIFinishStr
    );

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

      {/* Info: (20241017 - Julian) AI State */}
      <div className="flex flex-col items-end gap-12px">
        {displayedAIStateStr}
        {displayedWarningStr}
      </div>
    </div>
  );
};

export default AIWorkingArea;
