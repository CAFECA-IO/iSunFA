// Deprecated: (20240801 - Liz) 這個檔案已經不再使用，原本 src/components/kyc/kyc_form.tsx 會使用，現在已棄用。
import { useTranslation } from 'react-i18next';

const KYCFormController = ({
  step,
  onCancel,
  onNext,
  onSubmit,
}: {
  step: number;
  onCancel: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex gap-20px self-end">
      <button type="button" className="rounded px-4 py-2 text-secondaryBlue" onClick={onCancel}>
        {t('KYC.CANCEL')}
      </button>
      {step < 3 ? (
        <button
          type="button"
          className="rounded bg-button-surface-strong-primary px-4 py-2 text-button-text-primary-solid"
          onClick={onNext}
        >
          {t('KYC.NEXT')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          className="rounded bg-button-surface-strong-primary px-4 py-2 text-button-text-primary-solid"
        >
          {t('KYC.SUBMIT')}
        </button>
      )}
    </div>
  );
};

export default KYCFormController;
