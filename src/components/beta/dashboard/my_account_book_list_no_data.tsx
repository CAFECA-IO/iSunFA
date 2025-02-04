import { useTranslation } from 'next-i18next';

interface NoDataProps {
  toggleCreateCompanyModal: () => void;
}
const MyAccountBookListNoData = ({ toggleCreateCompanyModal }: NoDataProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-col items-center justify-center py-26px">
      <p className="text-base text-text-neutral-mute">
        {t('dashboard:DASHBOARD.COMPANY_NOT_YET_CREATED')}
      </p>
      <p className="text-base text-text-neutral-mute">
        {t('dashboard:DASHBOARD.PLEASE_PROCEED_TO')}{' '}
        <button
          type="button"
          onClick={toggleCreateCompanyModal}
          className="text-text-neutral-link underline underline-offset-4"
        >
          {t('dashboard:DASHBOARD.CREATE_A_COMPANY')}
        </button>
      </p>
    </div>
  );
};

export default MyAccountBookListNoData;
