import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// import { useTranslation } from 'next-i18next';
import { IoLogoFacebook } from 'react-icons/io';
import { AiFillGithub } from 'react-icons/ai';
import { TiSocialYoutubeCircular } from 'react-icons/ti';
import { ISUNFA_ROUTE } from '@/constants/url';

const CONTACT_ADDRESS =
  '13F.-6, No. 2, Ln. 150, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City 110416 , Taiwan';
const CONTACT_PHONE_NUMBER = '+886-2-2700-1979';
const SERVICE_HOURS = 'Mon to Fri, 09:00 AM - 06:00 PM.';
const MAP_LINK =
  'https://www.google.com/maps/place/%E5%8F%B0%E7%81%A3%E9%99%BD%E5%85%89%E9%9B%B2%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8/@25.0284838,121.5686008,17z/data=!3m2!4b1!5s0x3442abb276dbfb95:0x7472f9fce7899834!4m6!3m5!1s0x3442abcd4d78e29f:0x1501ae59ce954655!8m2!3d25.028479!4d121.5711757!16s%2Fg%2F11g9vrbw65?entry=ttu&g_ep=EgoyMDI0MTIwMS4xIKXMDSoASAFQAw%3D%3D';
const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61555435381112';
const GITHUB_LINK = 'https://github.com/CAFECA-IO/iSunFA';
const YOUTUBE_LINK = 'https://www.youtube.com/@isunfa';
const COPYRIGHT = 'iSunFA @ 2024. All rights reserved.';

const LandingFooter: React.FC = () => {
  //  const { t } = useTranslation('common');

  const displayNavigation = (
    <>
      <h3 className="text-lg font-bold">Quick Links</h3>
      <ul className="flex list-inside list-arrow flex-col gap-4px">
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Home</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Users</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Pricing</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Faith</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Join Us</Link>
        </li>
        <li className="hover:cursor-pointer hover:text-landing-page-orange">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>Terms of Service & Privacy Policy</Link>
        </li>
      </ul>
    </>
  );

  const displayContactUs = (
    <>
      <h3 className="text-lg font-bold">Contact Us</h3>
      <ul className="flex list-none flex-col gap-24px text-sm lg:gap-4px">
        <li className="flex gap-8px">
          <Image src="/icons/map_symbol.svg" alt="map_symbol" width={16} height={16} />
          <Link
            href={MAP_LINK}
            target="_blank"
            className="flex-1 hover:cursor-pointer hover:text-landing-page-orange"
          >
            {CONTACT_ADDRESS}
          </Link>
        </li>
        <li className="flex gap-8px">
          <Image src="/icons/phone.svg" alt="phone" width={16} height={16} />
          <Link
            href={`tel:${CONTACT_PHONE_NUMBER}`}
            className="flex-1 hover:cursor-pointer hover:text-landing-page-orange"
          >
            {CONTACT_PHONE_NUMBER}
          </Link>
        </li>
        <li className="flex gap-8px">
          <Image src="/icons/alarm.svg" alt="alarm" width={16} height={16} />
          <p>
            Service Hours : <br />
            {SERVICE_HOURS}
          </p>
        </li>
      </ul>
    </>
  );

  const displaySocialMedia = (
    <>
      <Link href={FACEBOOK_LINK} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <IoLogoFacebook size={40} />
        </button>
      </Link>
      <Link href={GITHUB_LINK} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <AiFillGithub size={40} />
        </button>
      </Link>
      {/* ToDO: (20241204 - Julian) React icon 中沒有和設計稿一樣的 Youtube icon，先以這個代替 */}
      <Link href={YOUTUBE_LINK} target="_blank" className="hover:text-landing-page-orange">
        <button type="button">
          <TiSocialYoutubeCircular size={40} />
        </button>
      </Link>
    </>
  );

  return (
    <footer>
      <div className="flex flex-col gap-24px rounded-2xl border-b bg-landing-page-white/30 px-16px py-48px shadow-landing-nav md:px-80px">
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
        <div className="ml-auto text-sm font-normal text-landing-page-gray">{COPYRIGHT}</div>
      </div>
    </footer>
  );
};

export default LandingFooter;
