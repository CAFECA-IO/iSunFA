import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';

const MyPaySlipPageBody: React.FC = () => {
  const { t } = useTranslation('calculator');
  const [currentTab, setCurrentTab] = useState<'received' | 'sent'>('received');

  const receivedStyle =
    currentTab === 'received'
      ? 'border-tabs-stroke-active text-tabs-text-active'
      : 'border-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover';
  const sentStyle =
    currentTab === 'sent'
      ? 'border-tabs-stroke-active text-tabs-text-active'
      : 'border-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover';

  const clickReceivedTab = () => setCurrentTab('received');
  const clickSentTab = () => setCurrentTab('sent');

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      {/* Info: (20250718 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250718 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-56px px-240px py-56px">
        <h1 className="text-center text-32px font-bold text-text-brand-primary-lv1">
          {t('calculator:MY_PAY_SLIP.MAIN_TITLE')}
        </h1>

        {/* Info: (20250718 - Julian) Tabs */}
        <div className="grid grid-cols-2 gap-16px">
          <button
            type="button"
            onClick={clickReceivedTab}
            className={`${receivedStyle} w-full border-b-2 px-12px py-8px`}
          >
            {t('calculator:MY_PAY_SLIP.TAB_RECEIVED')}
          </button>
          <button
            type="button"
            onClick={clickSentTab}
            className={`${sentStyle} w-full border-b-2 px-12px py-8px`}
          >
            {t('calculator:MY_PAY_SLIP.TAB_SENT')}
          </button>
        </div>

        {/* Info: (20250718 - Julian) List */}
        <div className="flex flex-col gap-24px"></div>
      </div>
    </main>
  );
};

export default MyPaySlipPageBody;
