import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { TbLogin2 } from 'react-icons/tb';
import { ISUNFA_ROUTE } from '@/constants/url';
import SalaryCalculatorResult from '@/components/salary_calculator/salary_result_section';
import SalaryFormSection from '@/components/salary_calculator/salary_form_section';
import { CalculatorProvider } from '@/contexts/calculator_context';

const SalaryCalculatorPageBody: React.FC = () => {
  const { t } = useTranslation('calculator');

  return (
    <CalculatorProvider>
      <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
        {/* Info: (20250708 - Julian) Header */}
        <div className="flex w-full items-center justify-between bg-surface-neutral-surface-lv1 px-60px py-12px">
          <div className="flex flex-1 items-center gap-lv-4">
            <Link href={ISUNFA_ROUTE.DASHBOARD}>
              <Image src="/logo/isunfa_logo_light.svg" alt="iSunFa_logo" width={100} height={30} />
            </Link>
            <p className="text-lg font-bold text-text-brand-primary-lv2">
              {t('calculator:PAGE.MAIN_TITLE')}
            </p>
          </div>

          <Link
            href={ISUNFA_ROUTE.LOGIN}
            className="flex items-center gap-8px px-24px py-10px font-medium text-button-text-primary"
          >
            <TbLogin2 size={24} />
            {t('calculator:BUTTON.LOGIN')}
          </Link>
        </div>

        {/* Info: (20250708 - Julian) Main Content */}
        <div className="flex">
          {/* Info: (20250708 - Julian) Left Section */}
          <SalaryFormSection />
          {/* Info: (20250708 - Julian) Right Section */}
          <SalaryCalculatorResult />
        </div>
      </main>
    </CalculatorProvider>
  );
};

export default SalaryCalculatorPageBody;
