import { useTranslation } from 'next-i18next';
import { FaCheck } from 'react-icons/fa6';
import { MdOutlineLocationCity } from 'react-icons/md';
import { FiPhoneCall } from 'react-icons/fi';
import { LuFilePlus2 } from 'react-icons/lu';

const KYCStepper = ({ currentStep }: { currentStep: number }) => {
  const { t } = useTranslation(['common', 'kyc']);

  const doneStepStyle = 'text-stepper-text-finish';
  const currentStepStyle = 'text-stepper-text-active';
  const futureStepStyle = 'text-stepper-text-default';

  return (
    <div className="relative flex w-full justify-between text-center md:w-500px">
      <div
        className={`z-10 flex w-120px flex-col items-center gap-2px text-sm ${currentStep > 0 ? doneStepStyle : currentStepStyle}`}
      >
        <div
          style={{ backgroundColor: currentStep > 0 ? '#002462' : '#FFA502' }}
          className="flex h-30px w-30px items-center justify-center rounded-full"
        >
          <FaCheck size={15} color="#FCFDFF" />
        </div>
        <p>{t('kyc:KYC.BASIC_INFO')}</p>
      </div>

      <div
        className={`absolute left-55px top-12px h-4px w-80px md:left-65px md:w-110px ${currentStep > 0 ? 'bg-stepper-surface-bar-secondary' : 'bg-stepper-surface-base'}`}
      ></div>

      <div
        className={`z-10 flex w-120px flex-col items-center gap-2px text-sm ${currentStep > 1 ? doneStepStyle : currentStep === 1 ? currentStepStyle : futureStepStyle}`}
      >
        <div
          style={{
            backgroundColor:
              currentStep > 1 ? '#002462' : currentStep === 1 ? '#FFA502' : '#CDD1D9',
          }}
          className="flex h-30px w-30px items-center justify-center rounded-full"
        >
          <MdOutlineLocationCity size={15} color={currentStep < 1 ? '#7F8A9D' : '#FCFDFF'} />
        </div>
        <p>{t('kyc:KYC.REGISTRATION_INFO')}</p>
      </div>

      <div
        className={`absolute left-130px top-12px h-4px w-120px md:left-190px ${currentStep > 1 ? 'bg-stepper-surface-bar-secondary' : 'bg-stepper-surface-base'}`}
      ></div>

      <div
        className={`z-10 flex w-120px flex-col items-center gap-2px text-sm ${currentStep > 2 ? doneStepStyle : currentStep === 2 ? currentStepStyle : futureStepStyle}`}
      >
        <div
          style={{
            backgroundColor:
              currentStep > 2 ? '#002462' : currentStep === 2 ? '#FFA502' : '#CDD1D9',
          }}
          className="flex h-30px w-30px items-center justify-center rounded-full"
        >
          <FiPhoneCall size={15} color={currentStep < 2 ? '#7F8A9D' : '#FCFDFF'} />
        </div>
        <p>{t('kyc:KYC.CONTACT_INFO')}</p>
      </div>

      <div
        className={`absolute right-55px top-12px h-4px w-80px md:right-65px md:w-110px ${currentStep > 2 ? 'bg-stepper-surface-bar-secondary' : 'bg-stepper-surface-base'}`}
      ></div>

      <div
        className={`z-10 flex w-120px flex-col items-center gap-2px text-sm ${currentStep > 3 ? doneStepStyle : currentStep === 3 ? currentStepStyle : futureStepStyle}`}
      >
        <div
          style={{
            backgroundColor:
              currentStep > 3 ? '#002462' : currentStep === 3 ? '#FFA502' : '#CDD1D9',
          }}
          className="flex h-30px w-30px items-center justify-center rounded-full"
        >
          <LuFilePlus2 size={15} color={currentStep < 3 ? '#7F8A9D' : '#FCFDFF'} />
        </div>
        <p>{t('kyc:KYC.UPLOAD_DOCUMENT')}</p>
      </div>
    </div>
  );
};

export default KYCStepper;
