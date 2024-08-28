import { useTranslation } from 'next-i18next';
import LeaveButton from '@/components/kyc/kyc_leave_button';
import KYCIntroContent from '@/components/kyc/kyc_intro_content';
import { useGlobalCtx } from '@/contexts/global_context';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { useState } from 'react';
import KYCForm from '@/components/kyc/kyc_form';

const KYCIntro = () => {
  const { layoutAssertion } = useGlobalCtx();
  const isMobile = layoutAssertion === LayoutAssertion.MOBILE;
  const { t } = useTranslation('common');
  const [step, setStep] = useState(0);

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main
      className={
        isMobile
          ? `flex flex-col gap-40px px-16px py-100px lg:hidden`
          : `hidden space-y-80px px-40px pb-300px pt-100px lg:block`
      }
    >
      {/* Page Title */}
      <section className={`pb-20px ${isMobile ? 'space-y-8px pt-50px' : 'space-y-16px pt-60px'} `}>
        <div className={`flex gap-24px ${isMobile ? 'items-center' : ''}`}>
          <LeaveButton />
          <h1
            className={`font-semibold text-text-neutral-secondary ${isMobile ? 'text-base' : 'text-36px'}`}
          >
            {t('kyc:KYC.COMPANY_VERIFICATION')}
          </h1>
        </div>
        {/* line */}
        <div className="py-10px">
          <div className="border border-divider-stroke-lv-4"></div>
        </div>
      </section>
      {step === 0 && (
        <KYCIntroContent
          isMobile={isMobile}
          onStart={() => {
            handleStepChange(1);
            scrollToTop();
          }}
        />
      )}
      {step === 1 && <KYCForm />}
    </main>
  );
};

export default KYCIntro;
