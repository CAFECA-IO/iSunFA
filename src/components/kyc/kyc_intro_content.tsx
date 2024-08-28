import Image from 'next/image';
import KYCButton from '@/components/kyc/kyc_button';
import { useTranslation } from 'next-i18next';

const KYCIntroContent = ({ isMobile, onStart }: { isMobile: boolean; onStart: () => void }) => {
  const { t } = useTranslation('common');

  return (
    <section className="mx-auto flex w-fit flex-col items-center gap-40px">
      <div>
        <Image
          src={'/elements/fingerprint.svg'}
          alt="fingerprint"
          width={isMobile ? 112 : 168}
          height={isMobile ? 112 : 168}
        />
      </div>
      <div>
        <p className="mb-20px text-sm font-medium text-text-neutral-secondary">
          {t('kyc:KYC.IN_THIS_VERIFICATION_PROCESS_YOU_WILL_NEED_TO')}...
        </p>
        <ul className="list-inside list-disc pl-10px text-base font-semibold">
          <li>{t('kyc:KYC.ENTER_COMPANY_INFORMATION')}</li>
          <li>{t('kyc:KYC.UPLOAD_BUSINESS_REGISTRATION_CERTIFICATE')}</li>
          <li>{t('kyc:KYC.UPLOAD_TAX_STATUS_CERTIFICATION_ISSUED_WITHIN_6_MONTHS')}</li>
          <li>{t('kyc:KYC.UPLOAD_PHOTO_OF_KEY_COMPANY_REPRESENTATIVE_S_ID')}</li>
        </ul>
      </div>
      <div>
        <KYCButton onClick={onStart} />
      </div>
    </section>
  );
};

export default KYCIntroContent;
