import Image from 'next/image';
import KYCButton from '@/components/kyc/kyc_button';

const KYCIntroContent = ({ isMobile, onStart }: { isMobile: boolean; onStart: () => void }) => {
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
          In this verification process you will need to...
        </p>
        <ul className="list-inside list-disc pl-10px text-base font-semibold">
          <li>Enter Company Information.</li>
          <li>Upload Business Registration Certificate.</li>
          <li>Upload Tax Status Certification (Issued within 6 months).</li>
          <li>Upload photo of Key Company Representative’s ID.</li>
        </ul>
      </div>
      <div>
        <KYCButton onClick={onStart} />
      </div>
    </section>
  );
};

export default KYCIntroContent;
