import React, { useState, useEffect } from 'react';
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
import { dummyJobList, IJobUI } from '@/interfaces/job';
import VacancyItem from '@/components/join_us/vacancy_item';
import { useHiringCtx } from '@/contexts/hiring_context';

enum SortOrder {
  Newest = 'newest',
  Oldest = 'oldest',
}

const JoinUsPageBody: React.FC = () => {
  const { t } = useTranslation(['landing_page']);
  const { favoriteJobIds, toggleFavoriteJobId } = useHiringCtx();

  const defaultJobList: IJobUI[] = dummyJobList.map((job) => {
    return { ...job, isFavorite: false };
  });

  // Info: (20250402 - Julian) 初始清單
  const [jobList, setJobList] = useState<IJobUI[]>(defaultJobList);
  // Info: (20250402 - Julian) 過濾後的清單
  const [filteredJobList, setFilteredJobList] = useState<IJobUI[]>(defaultJobList);
  // Info: (20250402 - Julian) 排序方式
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Newest);

  // Info: (20250505 - Julian) 監聽 favoriteJobIds 的變化
  useEffect(() => {
    const updatedJobList = jobList.map((job) => {
      const isFavorite = favoriteJobIds.includes(job.id);
      return { ...job, isFavorite };
    });
    setJobList(updatedJobList);
    setFilteredJobList(updatedJobList);
  }, [favoriteJobIds]);

  // Info: (20250505 - Julian) 監聽 jobList 的變化
  const filterJobs = (type: string, location: string, keyword: string) => {
    const newJobList = jobList.filter((job) => {
      // Info: (20250402 - Julian) Type filter: 不是 all 就是 我的最愛
      if (type !== 'all') {
        return job.isFavorite;
      }

      // Info: (20250402 - Julian) Location filter
      if (location !== 'all') {
        return job.location.toLowerCase() === location;
      }

      // Info: (20250402 - Julian) Keyword filter
      if (keyword !== '') {
        const isMatched =
          job.title.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword) ||
          job.jobResponsibilities.join(' ').toLowerCase().includes(keyword) ||
          job.requirements.join(' ').toLowerCase().includes(keyword) ||
          job.extraSkills.join(' ').toLowerCase().includes(keyword);

        return isMatched;
      }

      return true; // Info: (20250402 - Julian) Return all jobs
    });

    setFilteredJobList(newJobList);
  };

  const toggleSortOrder = () => {
    // Info: (20250402 - Julian) 切換排序方式
    setSortOrder(sortOrder === SortOrder.Newest ? SortOrder.Oldest : SortOrder.Newest);

    // Info: (20250402 - Julian) 更新 jobList 和 filteredJobList
    setJobList((prev) => {
      const sortedJobList = prev.sort((a, b) => {
        if (sortOrder === SortOrder.Newest) {
          return a.date - b.date; // Info: (20250402 - Julian) Sort by newest
        }
        return b.date - a.date; // Info: (20250402 - Julian) Sort by oldest
      });
      return sortedJobList;
    });

    setFilteredJobList((prev) => {
      const sortedFilterList = prev.sort((a, b) => {
        if (sortOrder === SortOrder.Newest) {
          return a.date - b.date; // Info: (20250402 - Julian) Sort by newest
        }
        return b.date - a.date; // Info: (20250402 - Julian) Sort by oldest
      });
      return sortedFilterList;
    });
  };

  const vacancyList = filteredJobList.map((job) => {
    const toggleFavorite = () => toggleFavoriteJobId(job.id);

    return (
      <VacancyItem
        key={job.id}
        job={job}
        isFavorite={job.isFavorite}
        toggleFavorite={toggleFavorite}
      />
    );
  });

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
          <JobFilterSection filterJobs={filterJobs} />

          <div className="flex flex-col gap-24px">
            {/* Info: (20250331 - Julian) Sort Order */}
            <div className="flex items-center justify-between">
              {/* Info: (20250331 - Julian) Available Position */}
              <p className="text-lg font-medium text-white">
                {t('hiring:JOIN_US_PAGE.AVAILABLE_POSITION')}{' '}
                <span className="font-semibold text-text-brand-primary-lv3">
                  {filteredJobList.length}
                </span>
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
