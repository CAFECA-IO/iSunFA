import Image from 'next/image';
import { useTranslation } from 'next-i18next';

const SalaryStepper = () => {
  const { t } = useTranslation(['common', 'journal']);

  return (
    <div className="relative flex items-center gap-120px text-xs md:text-sm">
      {/* Info: (20240715 - Julian) Step 1 */}
      <div className={`z-10 flex w-80px flex-col items-center gap-2px text-stepper-text-active`}>
        <Image src={'/icons/form_active.svg'} width={30} height={30} alt="step_1_fill_up_form" />
        <p>{t('journal:JOURNAL.FILL_UP_FORM')}</p>
      </div>

      {/* Info: (20240715 - Julian) Connecting Line */}
      <div className="absolute left-40px top-12px h-4px w-200px bg-stepper-surface-base"></div>

      {/* Info: (20240715 - Julian) Step 2 */}
      <div className="z-10 flex w-80px flex-col items-center gap-2px text-stepper-text-default">
        <Image src="/icons/confirm.svg" width={30} height={30} alt="step_3_confirm" />
        <p>{t('journal:JOURNAL.CONFIRM')}</p>
      </div>
    </div>
  );
};

export default SalaryStepper;
