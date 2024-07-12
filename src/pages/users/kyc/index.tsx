import Head from 'next/head';
import Image from 'next/image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const BackButton = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <button type="button" onClick={handleBack}>
      <div className="rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.53293 2.80365C8.82583 3.09655 8.82583 3.57142 8.53293 3.86431L5.1466 7.25065H12.6693C13.0835 7.25065 13.4193 7.58644 13.4193 8.00065C13.4193 8.41486 13.0835 8.75065 12.6693 8.75065H5.1466L8.53293 12.137C8.82583 12.4299 8.82583 12.9048 8.53293 13.1976C8.24004 13.4905 7.76517 13.4905 7.47227 13.1976L2.80561 8.53098C2.51271 8.23809 2.51271 7.76321 2.80561 7.47032L7.47227 2.80365C7.76517 2.51076 8.24004 2.51076 8.53293 2.80365Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </button>
  );
};

const KYCButton = () => {
  return (
    <button
      type="button"
      className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-32px py-14px text-lg font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover"
    >
      <p>Start KYC</p>
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

const KYCIntroPage = () => {
  const { t } = useTranslation('common');
  const { isAuthLoading } = useUserCtx();
  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <>
      {/* ===== Desktop ===== */}
      <main className="hidden space-y-80px px-40px pb-120px pt-100px lg:block">
        {/* Page Title */}
        <section className="space-y-16px pb-20px pt-60px">
          <div className="flex gap-24px">
            <BackButton />
            <h1 className="text-36px font-semibold text-text-neutral-secondary">
              Company Verification
            </h1>
          </div>
          {/* line */}
          <div className="my-10px border border-divider-stroke-lv-4"></div>
        </section>

        <section className="mx-auto flex w-fit flex-col items-center gap-40px">
          <div>
            <Image
              src={'/elements/fingerprint.svg'}
              alt="fingerprint"
              width={168}
              height={168}
            ></Image>
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
            <KYCButton />
          </div>
        </section>
      </main>

      {/* ===== Mobile ===== */}
      <main className="lg:hidden"></main>
    </>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('SALARY.SALARY_ISUNFA')}</title>
      </Head>

      <div className="min-h-screen bg-surface-neutral-main-background font-barlow">
        <NavBar />

        {displayedBody}
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default KYCIntroPage;

// const KYCIntroPage = () => {
//   return <div>Hello</div>;
// };

// export default KYCIntroPage;
