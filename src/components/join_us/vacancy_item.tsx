import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { timestampToString } from '@/lib/utils/common';
import { IJob } from '@/interfaces/job';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IVacancyItem {
  job: IJob;
  isFavorite: boolean;
  toggleFavorite: () => void;
}

const VacancyItem: React.FC<IVacancyItem> = ({ job, isFavorite, toggleFavorite }) => {
  const { t } = useTranslation(['hiring']);

  const { title, location, date, description } = job;
  const dateStr = timestampToString(date).dateWithSlash;

  const favoriteStar = (
    <button type="button" onClick={toggleFavorite} className="group">
      {isFavorite ? (
        <Image src="/icons/star_active.svg" width={32} height={32} alt="star_active" />
      ) : (
        <div className="relative">
          <Image src="/icons/star_default.svg" width={32} height={32} alt="star_default" />
          <Image
            src="/icons/star_hover.svg"
            width={32}
            height={32}
            alt="star_default"
            // Info: (20250402 - Julian) Hover Icon
            className="absolute top-0 z-10 hidden group-hover:block"
          />
        </div>
      )}
    </button>
  );

  return (
    <div className="relative flex w-full flex-col gap-40px rounded-xl border border-white bg-landing-nav px-60px py-40px shadow-landing-nav backdrop-blur-md">
      {/* Info: (20250402 - Julian) Nail Icon */}
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute left-15px top-15px" // Info: (20250402 - Julian) 左上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-15px left-15px" // Info: (20250402 - Julian) 左下角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute right-15px top-15px" // Info: (20250402 - Julian) 右上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-15px right-15px" // Info: (20250402 - Julian) 右下角
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-20px text-36px font-bold text-white">
          <p>{title}</p>
          {/* Info: (20250402 - Julian) Favorite Button */}
          {favoriteStar}
        </div>
        <LandingButton variant="primary" className="font-bold">
          {t('hiring:JOIN_US_PAGE.APPLY_NOW_BTN')}
        </LandingButton>
      </div>

      <div className="flex flex-col gap-16px">
        <div className="flex items-center gap-40px text-lg font-semibold text-surface-brand-primary">
          <p>{t(`hiring:LOCATION.${location.toUpperCase()}`)}</p> <p>{dateStr}</p>
        </div>
        <div className="line-clamp-3 text-lg text-landing-page-gray">{description}</div>
      </div>
    </div>
  );
};

export default VacancyItem;
