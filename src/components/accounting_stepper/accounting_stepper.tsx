import Image from 'next/image';
import { AccountingStep } from '../../interfaces/stepper_string';

interface IAccountingStepperProps {
  step: AccountingStep;
}

const AccountingStepper = ({ step }: IAccountingStepperProps) => {
  const isStepTwo = step === AccountingStep.STEP_TWO;

  // Info: (20240423 - Julian) Step 1 icon
  const stepOneSrc = isStepTwo ? '/icons/input_done.svg' : '/icons/input_active.svg';
  const stepOneStyle = isStepTwo ? 'text-navyBlue2' : 'text-primaryYellow5';

  // Info: (20240423 - Julian) Connecting Line 1
  const connectingLineStyle = isStepTwo ? 'bg-navyBlue2' : 'bg-lightGray6';

  // Info: (20240423 - Julian) Step 2 icon
  const stepTwoSrc = isStepTwo ? '/icons/form_active.svg' : '/icons/form.svg';
  const stepTwoStyle = isStepTwo ? 'text-primaryYellow5' : 'text-lightGray4';

  return (
    <div className="relative flex items-center gap-40px md:gap-120px">
      {/* Info: (20240422 - Julian) Step 1 */}
      <div className={`z-10 flex flex-col items-center gap-2px text-sm ${stepOneStyle}`}>
        <Image src={stepOneSrc} width={30} height={30} alt="step_1_input_type" />
        <p>Input Type</p>
      </div>

      {/* Info: (20240422 - Julian) Connecting Line */}
      <div
        className={`absolute left-40px top-12px h-4px w-90px md:w-180px ${connectingLineStyle}`}
      ></div>

      {/* Info: (20240422 - Julian) Step 2 */}
      <div className={`z-10 flex flex-col items-center gap-2px text-sm ${stepTwoStyle}`}>
        <Image src={stepTwoSrc} width={30} height={30} alt="step_2_fill_up_form" />
        <p>Fill Up Form</p>
      </div>

      {/* Info: (20240422 - Julian) Connecting Line */}
      <div className="absolute right-30px top-12px h-4px w-90px bg-lightGray6 md:w-180px"></div>

      {/* Info: (20240422 - Julian) Step 3 */}
      <div className="z-10 flex flex-col items-center gap-2px text-sm text-lightGray4">
        <Image src="/icons/confirm.svg" width={30} height={30} alt="step_3_confirm" />
        <p>Confirm</p>
      </div>
    </div>
  );
};

export default AccountingStepper;
