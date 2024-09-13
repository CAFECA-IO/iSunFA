import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import { copyright } from '@/constants/config';
import { GrLocation } from 'react-icons/gr';
import { BiPhoneCall, BiLogoFacebookSquare } from 'react-icons/bi';
import { LuAlarmClock } from 'react-icons/lu';
import { IoLogoGithub } from 'react-icons/io';
import { TiSocialYoutubeCircular } from 'react-icons/ti';
import { useTranslation } from 'next-i18next';

const CONTACT_PHONE_NUMBER = '+886-2-2700-1979';
const GITHUB_LINK = 'https://github.com/CAFECA-IO';
const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61555435381112';
const YOUTUBE_LINK = 'https://www.youtube.com/@isunfa';

function LandingFooter() {
  const { t } = useTranslation(['common']);

  return (
    <footer className="space-y-24px bg-navy-blue-700 px-20px py-48px text-text-neutral-invert tablet:px-80px">
      <section className="flex items-center gap-26px">
        <Image src="/logo/isunfa_logo.svg" alt="iSunFA Logo" width={147} height={30}></Image>
        <p className="text-lg font-semibold">/ Intelligent Accounting</p>
      </section>

      <section className="flex flex-col justify-between gap-20px laptop:flex-row">
        <div className="flex flex-col gap-40px tablet:flex-row">
          <div className="space-y-20px text-lg font-medium">
            <h5>{t('common:LANDING_FOOTER.QUICK_LINKS')}</h5>
            <div className="flex flex-col gap-8px">
              <Link href={ISUNFA_ROUTE.LANDING_PAGE}>‣ {t('common:LANDING_FOOTER.HOME')}</Link>
              <Link href={ISUNFA_ROUTE.USER_TERMS}>‣ {t('common:LANDING_FOOTER.USER_TERMS')}</Link>
              <Link href={ISUNFA_ROUTE.PRIVACY_POLICY}>
                ‣ {t('common:LANDING_FOOTER.PRIVACY_POLICY')}
              </Link>
            </div>
          </div>

          <div className="space-y-20px">
            <h5 className="text-lg font-medium">{t('common:LANDING_FOOTER.CONTACT_US')}</h5>
            <ul className="flex flex-col gap-16px font-poppins text-sm">
              <li className="flex items-center gap-8px">
                <GrLocation size={20} />
                <p>{t('common:LANDING_FOOTER.CONTACT_ADDRESS')}</p>
              </li>
              <li className="flex items-center gap-8px">
                <BiPhoneCall size={20} />
                <p>{CONTACT_PHONE_NUMBER}</p>
              </li>
              <li className="flex items-center gap-8px">
                <LuAlarmClock size={20} />
                <p>
                  {t('common:LANDING_FOOTER.SERVICE_HOURS')} : <br />
                  {t('common:LANDING_FOOTER.MON_TO_FRI_9AM_6PM')}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-20px laptop:justify-start">
          <Link href={FACEBOOK_LINK} target="_blank">
            <BiLogoFacebookSquare size={40} />
          </Link>
          <Link href={GITHUB_LINK} target="_blank">
            <IoLogoGithub size={40} />
          </Link>
          <Link href={YOUTUBE_LINK} target="_blank">
            <TiSocialYoutubeCircular size={40} />
          </Link>
        </div>
      </section>

      <section className="text-end font-poppins">{copyright}</section>
    </footer>
  );
}

export default LandingFooter;
