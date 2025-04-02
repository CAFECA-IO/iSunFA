import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import JobFilterSection from '@/components/join_us/filter_section';
import { IJob, dummyJobList } from '@/interfaces/job';
import VacancyItem from '@/components/join_us/vacancy_item';

enum SortOrder {
  Newest = 'newest',
  Oldest = 'oldest',
}

const JoinUsPageBody: React.FC = () => {
  const { t } = useTranslation(['landing_page']);

  // Deprecated: (20250331 - Julian) 施工中
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [jobList, setJobList] = useState<IJob[]>(dummyJobList);

  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Newest);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === SortOrder.Newest ? SortOrder.Oldest : SortOrder.Newest);
  };

  const vacancyList = jobList.map((job) => <VacancyItem key={job.id} {...job} />);

  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250331 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-join-us bg-contain bg-right-top bg-no-repeat md:h-670px lg:h-1024px"></div>

      {/* Info: (20250331 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 overflow-y-auto overflow-x-hidden">
        <div className="flex w-full flex-col items-stretch gap-100px px-150px py-100px">
          {/* Info: (20250331 - Julian) Title */}
          <div className="flex w-450px flex-col gap-lv-3">
            <LinearGradientText size={LinearTextSize.LG} align={TextAlign.LEFT}>
              {t('hiring:JOIN_US_PAGE.MAIN_TITLE')}
            </LinearGradientText>
            <p className="text-lg font-medium">{t('hiring:JOIN_US_PAGE.MAIN_DESCRIPTION')}</p>
          </div>

          {/* Info: (20250331 - Julian) Filter Section */}
          <JobFilterSection />

          <div className="flex flex-col gap-24px">
            {/* Info: (20250331 - Julian) Sort Order */}
            <div className="flex items-center justify-between">
              {/* Info: (20250331 - Julian) Available Position */}
              <p className="text-lg font-medium text-white">
                {t('hiring:JOIN_US_PAGE.AVAILABLE_POSITION')}{' '}
                <span className="font-semibold text-text-brand-primary-lv3">{jobList.length}</span>
              </p>
              {/* Info: (20250331 - Julian) Sort Order */}
              <button
                type="button"
                onClick={toggleSortOrder}
                className="flex items-center gap-8px hover:text-surface-brand-primary"
              >
                <p className="text-lg font-medium capitalize">
                  {t(`hiring:SORT.${sortOrder.toUpperCase()}`)}
                </p>
                <Image
                  src="/icons/sort-descending.svg"
                  alt="Sort Descending"
                  width={20}
                  height={20}
                />
              </button>
            </div>
            {/* Info: (20250331 - Julian) Vacancy List */}
            <div className="flex flex-col gap-lv-7">{vacancyList}</div>
          </div>
        </div>

        {/* Info: (20250331 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default JoinUsPageBody;
