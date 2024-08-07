import Image from 'next/image';
import { AccountingStep } from '@/interfaces/stepper_string';
import { useTranslation } from 'next-i18next';

interface IAccountingStepperProps {
  step: AccountingStep;
}

const AccountingStepper = ({ step }: IAccountingStepperProps) => {
  const { t } = useTranslation('common');
  const isStepTwo = step === AccountingStep.STEP_TWO;

  // Info: (20240423 - Julian) Step 1 icon
  const stepOneSrc = isStepTwo ? '/icons/upload_done.svg' : '/icons/upload_active.svg';
  const stepOneStyle = isStepTwo ? 'text-navyBlue2' : 'text-primaryYellow5';

  // Info: (20240423 - Julian) Connecting Line 1
  const connectingLineStyle = isStepTwo ? 'bg-navyBlue2' : 'bg-lightGray6';

  // Info: (20240423 - Julian) Step 2 icon
  const stepTwoSrc = isStepTwo ? '/icons/form_active.svg' : '/icons/form.svg';
  const stepTwoStyle = isStepTwo ? 'text-primaryYellow5' : 'text-lightGray4';

  return (
    <div className="relative flex items-center gap-40px md:gap-120px">
      {/* Info: (20240422 - Julian) Step 1 */}
      <div className={`z-10 flex w-80px flex-col items-center gap-2px text-sm ${stepOneStyle}`}>
        <Image src={stepOneSrc} width={30} height={30} alt="step_1_upload" />
        <p>{t('JOURNAL.UPLOAD')}</p>
      </div>

      {/* Info: (20240422 - Julian) Connecting Line */}
      <div
        className={`absolute left-30px top-12px h-4px w-90px md:w-200px ${connectingLineStyle}`}
      ></div>

      {/* Info: (20240422 - Julian) Step 2 */}
      <div className={`z-10 flex w-80px flex-col items-center gap-2px text-sm ${stepTwoStyle}`}>
        <Image src={stepTwoSrc} width={30} height={30} alt="step_2_fill_up_form" />
        <p>{t('JOURNAL.FILL_UP_FORM')}</p>
      </div>

      {/* Info: (20240422 - Julian) Connecting Line */}
      <div className="absolute right-30px top-12px h-4px w-90px bg-lightGray6 md:w-200px"></div>

      {/* Info: (20240422 - Julian) Step 3 */}
      <div className="z-10 flex w-80px flex-col items-center gap-2px text-sm text-lightGray4">
        <Image src="/icons/confirm.svg" width={30} height={30} alt="step_3_confirm" />
        <p>{t('JOURNAL.CONFIRM')}</p>
      </div>
    </div>
  );
};

export default AccountingStepper;
