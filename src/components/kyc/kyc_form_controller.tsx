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
    <div className="mt-6 flex justify-end gap-40px">
      <button type="button" className="rounded bg-gray-500 px-4 py-2 text-white" onClick={onCancel}>
        {t('KYC.CANCEL')}
      </button>
      {step < 3 ? (
        <button
          type="button"
          className="rounded bg-yellow-500 px-4 py-2 text-white"
          onClick={onNext}
        >
          {t('KYC.NEXT')}
        </button>
      ) : (
        <button
          type="button"
          className="rounded bg-yellow-500 px-4 py-2 text-white"
          onSubmit={onSubmit}
        >
          {t('KYC.SUBMIT')}
        </button>
      )}
    </div>
  );
};

export default KYCFormController;
