import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';
import { timestampToString } from '@/lib/utils/common';

interface IOperatingMechanismData {
  version: string;
  lastUpdated: number;
  content: string;
}

const OperatingMechanismContent: React.FC = () => {
  const { t } = useTranslation('calculator');

  const [data, setData] = useState<IOperatingMechanismData | null>(null);

  useEffect(() => {
    fetch('/api/v2/salary_calculator_operating_mechanism')
      .then((response) => response.json())
      .then((d: IOperatingMechanismData) => {
        setData(d);
      });
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center px-100px">Loading...</div>;
  }

  const { version, lastUpdated, content } = data;

  const lastUpdatedTimestamp = new Date(lastUpdated).getTime() / 1000;
  const formattedDate = timestampToString(lastUpdatedTimestamp).date;

  const subtitle = `${version} - ${formattedDate}`;

  const formattedContent = content
    .replace(/<h1/g, '<h1 class="mt-56px text-lg font-semibold text-text-neutral-primary"')
    .replace(/<h2/g, '<h2 class="mt-10px text-md font-semibold text-text-neutral-secondary"')
    .replace(/<ol/g, '<ol class="ml-20px list-decimal list-outside text-text-neutral-secondary"')
    .replace(/<ul/g, '<ul class="ml-20px list-disc list-outside text-text-neutral-secondary"')
    .replace(/<p/g, '<p class="text-base font-medium text-text-neutral-secondary"');

  return (
    <div className="flex flex-col items-stretch p-80px">
      <div className="flex flex-col items-center gap-4px">
        <h1 className="text-center text-xl font-semibold text-text-neutral-primary">
          {t('Salary Calculator Operating Mechanism')}
        </h1>
        <p className="text-xs font-normal text-text-neutral-tertiary">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-4px">
        <article dangerouslySetInnerHTML={{ __html: formattedContent }} />
      </div>
    </div>
  );
};

const OperatingMechanismPageBody: React.FC = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20251112 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20251112 - Julian) Main Content */}
      <OperatingMechanismContent />
    </main>
  );
};

export default OperatingMechanismPageBody;
