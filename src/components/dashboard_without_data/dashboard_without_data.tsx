import { useTranslation } from 'next-i18next';
import Image from 'next/image';

const DashboardWithoutData = () => {
  const { t } = useTranslation('common');
  const displayedPageBody = (
    <div>
      {/* Info: (20240415 - Shirley) empty icon section */}
      <div className="flex h-screen w-full items-center justify-center">
        {' '}
        <section className="flex flex-col items-center">
          {/* // Deprecated: (20240918 - Liz) */}
          <div>
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              width="49"
              height="27"
              viewBox="0 0 49 27"
              fill="none"
            >
              <path
                d="M13 17.4956L10 14.4956"
                stroke="#002462"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M3.0001 8.49571L3 8.49561"
                stroke="#002462"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M39 17.4956L46 10.4956"
                stroke="#002462"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M26 17.4956L26 2.49561"
                stroke="#002462"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg> */}
          </div>
          {/* // Deprecated: (20240918 - Liz) */}
          <div>
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
            >
              <path
                d="M44.5716 14.6387H3.42871V37.7815C3.42871 40.6218 5.73124 42.9244 8.57157 42.9244H39.4287C42.2689 42.9244 44.5716 40.6218 44.5716 37.7815V14.6387Z"
                fill="#002462"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.14286 0.0671387C2.30254 0.0671387 0 2.36966 0 5.21V10.3529C0 13.1932 2.30254 15.4957 5.14286 15.4957H42.8571C45.6974 15.4957 48 13.1932 48 10.3529V5.21C48 2.36966 45.6974 0.0671387 42.8571 0.0671387H5.14286ZM18.8571 23.6386C17.6737 23.6386 16.7143 24.5979 16.7143 25.7814C16.7143 26.9649 17.6737 27.9243 18.8571 27.9243H29.1429C30.3263 27.9243 31.2857 26.9649 31.2857 25.7814C31.2857 24.5979 30.3263 23.6386 29.1429 23.6386H18.8571Z"
                fill="#FFA502"
              />
            </svg> */}
          </div>

          <div>
            <Image src="/icons/empty_box.svg" alt="empty_box" width={48} height={69}></Image>
          </div>
          <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
            {t('common:COMMON.EMPTY')}
          </div>
        </section>
      </div>
    </div>
  );

  return <div>{displayedPageBody}</div>;
};

export default DashboardWithoutData;
