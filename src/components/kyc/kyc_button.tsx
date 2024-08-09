import { useTranslation } from 'next-i18next';

const KYCButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('common');
  return (
    <button
      type="button"
      className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-32px py-14px text-lg font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover"
      onClick={onClick}
    >
      <p>{t('KYC.START_KYC')}</p>
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.7699 4.45646C12.2093 4.01712 12.9216 4.01712 13.3609 4.45646L20.1109 11.2065C20.5503 11.6458 20.5503 12.3581 20.1109 12.7974L13.3609 19.5474C12.9216 19.9868 12.2093 19.9868 11.7699 19.5474C11.3306 19.1081 11.3306 18.3958 11.7699 17.9565L17.7244 12.002L11.7699 6.04745C11.3306 5.60811 11.3306 4.8958 11.7699 4.45646Z"
            fill="#FCFDFF"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.56543 12.002C3.56543 11.3806 4.06911 10.877 4.69043 10.877H18.3779C18.9992 10.877 19.5029 11.3806 19.5029 12.002C19.5029 12.6233 18.9992 13.127 18.3779 13.127H4.69043C4.06911 13.127 3.56543 12.6233 3.56543 12.002Z"
            fill="#FCFDFF"
          />
        </svg>
      </div>
    </button>
  );
};

export default KYCButton;
