import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import useShareProcess from '@/lib/hooks/use_share_process';
import { TbArrowBack } from 'react-icons/tb';
import { FaLine, FaFacebookSquare } from 'react-icons/fa';
import { FaSquareXTwitter } from 'react-icons/fa6';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import FavoriteButton from '@/components/join_us/favorite_button';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { IVacancyDetail } from '@/interfaces/vacancy';
import { timestampToString } from '@/lib/utils/common';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useHiringCtx } from '@/contexts/hiring_context';
import { haloStyle } from '@/constants/display';
import { ShareSettings } from '@/constants/social_media';

interface IVacancyDetailBodyProps {
  jobData: IVacancyDetail;
}

const VacancyDetailBody: React.FC<IVacancyDetailBodyProps> = ({ jobData }) => {
  const { t } = useTranslation(['hiring', 'common']);
  const { id, title, location, date, description, responsibilities, requirements, extraSkills } =
    jobData;
  const { favoriteVacancyIds, toggleFavoriteVacancyId } = useHiringCtx();

  const {
    targetRef,
    componentVisible: isSharingOpen,
    setComponentVisible: setSharingOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250507 - Julian) 分享路徑
  const { share } = useShareProcess({ sharePath: `${ISUNFA_ROUTE.JOIN_US}/${id}` });

  // Info: (20250507 - Julian) 社群媒體按鈕
  const socialMedias = Object.entries(ShareSettings).map(([key, value]) => {
    const icon = {
      FACEBOOK: <FaFacebookSquare size={24} />,
      TWITTER: <FaSquareXTwitter size={24} />,
      LINE: <FaLine size={24} />,
    }[key as keyof typeof ShareSettings];

    const onClick = () => {
      share({
        socialMedia: key as keyof typeof ShareSettings,
        text: 'Check out this job opportunity!',
        size: value.size,
      });
    };

    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        className="text-white hover:text-surface-brand-primary-moderate"
      >
        {icon}
      </button>
    );
  });

  // Info: (20250505 - Julian) 將時間戳轉換為日期格式
  const dateString = timestampToString(date).dateWithSlash;

  // Info: (20250505 - Julian) 在 favoriteVacancyIds 中找是否有該 vacancyId
  const isFavorite = favoriteVacancyIds.includes(id);

  // Info: (20250505 - Julian) 點擊後 toggle favorite
  const toggleFavorite = () => toggleFavoriteVacancyId(id);
  // Info: (20250505 - Julian) 點擊後 toggle share
  const toggleShare = () => setSharingOpen(!isSharingOpen);

  const resList = responsibilities.map((item) => (
    <li key={item} className="text-sm leading-8 lg:text-lg lg:leading-10">
      {item}
    </li>
  ));

  const reqList = requirements.map((item) => (
    <li key={item} className="text-sm leading-8 lg:text-lg lg:leading-10">
      {item}
    </li>
  ));

  const extraList = extraSkills.map((item) => (
    <li key={item} className="text-sm leading-8 lg:text-lg lg:leading-10">
      {item}
    </li>
  ));

  const sharingBtn = (
    <div ref={targetRef} className="relative flex flex-col">
      <div
        className={`${haloStyle} ${
          isSharingOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-10px opacity-0'
        } absolute -top-14 flex items-center gap-12px rounded-xs px-12px py-8px transition-all duration-200 ease-in-out`}
      >
        {socialMedias}
      </div>
      <button type="button" className="p-10px hover:opacity-80" onClick={toggleShare}>
        <Image src="/icons/share_link.svg" width={24} height={24} alt="share_icon" />
      </button>
    </div>
  );

  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250407 - Julian) Background */}
      <div className="absolute inset-x-0 -top-24 h-546px w-full bg-job-detail bg-cover bg-top bg-no-repeat md:h-670px lg:top-0 lg:h-1024px lg:bg-contain"></div>

      {/* Info: (20250407 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 overflow-y-auto overflow-x-hidden">
        {/* Info: (20250407 - Julian) Job Detail */}
        <div className="flex flex-col items-stretch gap-50px px-16px pb-100px pt-50px lg:gap-100px lg:px-150px lg:pt-500px">
          {/* Info: (20250407 - Julian) Job Head */}
          <div className="flex flex-col items-center">
            <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
              {title}
            </LinearGradientText>
            <div className="flex items-center gap-lv-5 text-base font-semibold text-surface-brand-primary lg:text-xl">
              <p>{location}</p>
              <p>{dateString}</p>
            </div>
          </div>

          {/* Info: (20250407 - Julian) Job Body */}
          <div className="flex flex-col gap-lv-10">
            {/* Info: (20250407 - Julian) Job Description */}
            <div className="flex flex-col gap-10px lg:gap-40px">
              <h2 className="text-2xl font-bold text-text-brand-primary-lv3 lg:text-36px">
                Job Description
              </h2>
              <p className="text-sm leading-8 lg:text-lg lg:leading-10">{description}</p>
            </div>
            {/* Info: (20250407 - Julian) Your Job Will Be ... */}
            <div className="flex flex-col gap-10px lg:gap-40px">
              <h2 className="text-2xl font-bold text-text-brand-primary-lv3 lg:text-36px">
                Your Job Will Be ...
              </h2>
              <ul className="list-inside list-disc">{resList}</ul>
            </div>
            {/* Info: (20250407 - Julian) What Makes You a Great Fit */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-2xl font-bold text-text-brand-primary-lv3 lg:text-36px">
                What Makes You a Great Fit
              </h2>
              <ul className="flex list-inside list-disc list-image-orange-check flex-col gap-4px">
                {reqList}
              </ul>
            </div>
            {/* Info: (20250407 - Julian) Extra Power You Bring */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-2xl font-bold text-text-brand-primary-lv3 lg:text-36px">
                Extra Power You Bring
              </h2>
              <ul className="flex list-inside list-disc list-image-orange-plus flex-col gap-4px">
                {extraList}
              </ul>
            </div>
          </div>

          {/* Info: (20250407 - Julian) Job Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-lv-5">
              {/* Info: (20250402 - Julian) Favorite Button */}
              <FavoriteButton isActive={isFavorite} clickHandler={toggleFavorite} />
              {/* Info: (20250407 - Julian) Share Button */}
              {sharingBtn}
            </div>

            <div className="flex items-center gap-lv-6">
              {/* Info: (20250407 - Julian) Back Button */}
              <Link href={ISUNFA_ROUTE.JOIN_US}>
                <LandingButton type="button" variant="default" className="font-bold">
                  <TbArrowBack size={28} />
                  {t('common:COMMON.BACK')}
                </LandingButton>
              </Link>
              {/* Info: (20250407 - Julian) Apply Now Button */}
              <Link href={`${ISUNFA_ROUTE.JOIN_US}/${id}/resume`}>
                <LandingButton variant="primary" className="font-bold">
                  {t('hiring:JOIN_US_PAGE.APPLY_NOW_BTN')}
                </LandingButton>
              </Link>
            </div>
          </div>
        </div>

        {/* Info: (20250407 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default VacancyDetailBody;
