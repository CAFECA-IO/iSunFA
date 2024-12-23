import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { IoLogoFacebook } from 'react-icons/io';
import { AiFillGithub } from 'react-icons/ai';
import { TiSocialYoutubeCircular } from 'react-icons/ti';
import { ISUNFA_ROUTE } from '@/constants/url';
import {
  iSunFAAddress,
  iSunFAAddressInChinese,
  iSunFAPhone,
  githubLink,
  facebookLink,
  youtubeLink,
  iSunFAAddressOnMap,
  copyright,
} from '@/constants/config';

const SERVICE_HOURS = 'Mon to Fri, 09:00 AM - 06:00 PM.';

const LandingFooter: React.FC = () => {
  const { t } = useTranslation('common');
  const { locale } = useRouter();

  // Info: (20241204 - Julian) 從語言判斷要顯示哪個地址
  const address = locale === 'en' ? iSunFAAddress : iSunFAAddressInChinese;

  // ToDo: (20241219 - Julian) 補上正確的路徑
  const displayNavigation = (
    <>
      <h3 className="text-lg font-bold">{t('landing_page_v2:FOOTER.QUICK_LINKS')}</h3>
      <ul className="flex list-inside list-arrow flex-col gap-4px">
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.HOME')}</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.USERS')}</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.PRICING')}</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.FAITH')}</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.JOIN_US')}</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>{t('landing_page_v2:FOOTER.PRIVACY_POLICY')}</Link>
        </li>
      </ul>
    </>
  );

  const displayContactUs = (
    <>
      <h3 className="text-lg font-bold">{t('landing_page_v2:FOOTER.CONTACT_US')}</h3>
      <ul className="flex list-none flex-col gap-24px text-sm lg:gap-4px">
        <li className="flex gap-8px">
          <Image src="/icons/map_symbol.svg" alt="map_symbol" width={16} height={16} />
          <Link
            href={iSunFAAddressOnMap ?? '/'}
            target="_blank"
            className="flex-1 hover:cursor-pointer hover:text-landing-page-orange"
          >
            {address}
          </Link>
        </li>
        <li className="flex gap-8px">
          <Image src="/icons/phone.svg" alt="phone" width={16} height={16} />
          <Link
            href={`tel:${iSunFAPhone}`}
            className="flex-1 hover:cursor-pointer hover:text-landing-page-orange"
          >
            {iSunFAPhone}
          </Link>
        </li>
        <li className="flex gap-8px">
          <Image src="/icons/alarm.svg" alt="alarm" width={16} height={16} />
          <p>
            {t('landing_page_v2:FOOTER.SERVICE_HOURS')}: <br />
            {SERVICE_HOURS}
          </p>
        </li>
      </ul>
    </>
  );

  const displaySocialMedia = (
    <>
      <Link href={facebookLink ?? '/'} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <IoLogoFacebook size={40} />
        </button>
      </Link>
      <Link href={githubLink ?? '/'} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <AiFillGithub size={40} />
        </button>
      </Link>
      {/* ToDO: (20241204 - Julian) React icon 中沒有和設計稿一樣的 Youtube icon，先以這個代替 */}
      <Link href={youtubeLink ?? '/'} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <TiSocialYoutubeCircular size={40} />
        </button>
      </Link>
    </>
  );

  return (
    <footer className="mx-16px flex flex-col gap-24px rounded-sm border-b bg-landing-nav px-16px py-48px shadow-landing-nav backdrop-blur-md md:mx-36px md:px-80px">
      <div className="flex flex-col gap-40px lg:flex-row">
        <div className="flex flex-col items-center justify-between gap-40px md:flex-row">
          {/* Info: (20241204 - Julian) Logo */}
          <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="w-150px">
            <Image src="/logo/isunfa_logo_new.svg" alt="logo" width={141} height={40} />
          </Link>

          {/* Info: (20241204 - Julian) Social Media */}
          <div className="flex items-start justify-end gap-20px text-landing-page-white lg:hidden">
            {displaySocialMedia}
          </div>
        </div>

        {/* Info: (20241204 - Julian) Navigation */}
        <div className="hidden w-300px flex-col gap-24px text-landing-page-white lg:flex">
          {displayNavigation}
        </div>

        {/* Info: (20241204 - Julian) Contact Us */}
        <div className="flex flex-col gap-24px text-landing-page-white lg:w-300px">
          {displayContactUs}
        </div>

        {/* Info: (20241204 - Julian) Social Media */}
        <div className="hidden flex-1 items-start justify-end gap-20px text-landing-page-white lg:flex">
          {displaySocialMedia}
        </div>
      </div>

      {/* Info: (20241204 - Julian) Copy Right */}
      <div className="ml-auto text-sm font-normal text-landing-page-gray">{copyright}</div>
    </footer>
  );
};

export default LandingFooter;
