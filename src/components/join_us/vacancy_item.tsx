import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { timestampToString } from '@/lib/utils/common';
import { IVacancy } from '@/interfaces/vacancy';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import FavoriteButton from '@/components/join_us/favorite_button';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IVacancyItem {
  vacancy: IVacancy;
  isFavorite: boolean;
  toggleFavorite: () => void;
}

const VacancyItem: React.FC<IVacancyItem> = ({ vacancy, isFavorite, toggleFavorite }) => {
  const { t } = useTranslation(['hiring']);

  const { id, title, location, date, description } = vacancy;
  const dateStr = timestampToString(date).dateWithSlash;

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
          <FavoriteButton isActive={isFavorite} clickHandler={toggleFavorite} />
        </div>

        <Link href={`${ISUNFA_ROUTE.JOIN_US}/${id}`}>
          <LandingButton variant="primary" className="font-bold">
            {t('hiring:JOIN_US_PAGE.APPLY_NOW_BTN')}
          </LandingButton>
        </Link>
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
