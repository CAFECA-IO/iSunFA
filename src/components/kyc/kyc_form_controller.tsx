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
          className="rounded bg-primaryYellow5 px-4 py-2 text-primaryYellow2"
          onClick={onNext}
        >
          {t('KYC.NEXT')}
        </button>
      ) : (
        <button
          type="button"
          className="rounded bg-primaryYellow5 px-4 py-2 text-primaryYellow2"
          onSubmit={onSubmit}
        >
          {t('KYC.SUBMIT')}
        </button>
      )}
    </div>
  );
};

export default KYCFormController;
