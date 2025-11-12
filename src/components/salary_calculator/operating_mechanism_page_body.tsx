import React from 'react';
import { useTranslation } from 'next-i18next';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';
import { timestampToString } from '@/lib/utils/common';

const OperatingMechanismPageBody: React.FC = () => {
  const { t } = useTranslation('calculator');

  const version = 'v1.0.0';
  const lastUpdated = 1761868800;

  const formattedLastUpdated = timestampToString(lastUpdated).date;
  const subtitle = `${version} - ${formattedLastUpdated}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20250715 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250715 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-56px p-80px">
        <div className="flex flex-col items-center gap-4px">
          <h1 className="text-center text-xl font-semibold text-text-neutral-primary">
            {t('Salary Calculator Operating Mechanism')}
          </h1>
          <p className="text-xs font-normal text-text-neutral-tertiary">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-4px">
          <p className="text-lg font-semibold text-text-neutral-primary">
            Chapter 1 — General Provisions
          </p>
          <p className="text-base font-medium text-text-neutral-secondary">
            Article 1 — Purpose <br />
            This document defines the formulas used by the iSunFA Salary Calculator. It aims to
            ensure fairness, accuracy, and legal compliance in payroll calculation. It clarifies
            salary structure, computation logic, and withholding items. Enterprises are recommended
            to refer to this document when explaining or agreeing on payroll terms with employees.
            <br />
            Article 2 — Scope <br />
            This document applies to all employees working within the Republic of China (Taiwan),
            including both domestic and foreign nationals. <br />
            Article 3 — Legal Basis <br />
            This document is established in accordance with the Labor Standards Act, Labor Insurance
            Act, National Health Insurance Act, Labor Pension Act, taxation laws, and other relevant
            regulations of Taiwan. It is periodically reviewed and updated, and changes will be
            reflected in the iSunFA Salary Calculator.For any matters not covered or where
            inconsistencies arise, government regulations shall prevail.
          </p>
        </div>
      </div>
    </main>
  );
};

export default OperatingMechanismPageBody;
