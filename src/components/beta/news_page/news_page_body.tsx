import { useState, useRef } from 'react';
import Pagination from '@/components/pagination/pagination';
import TabsForLatestNews from '@/components/beta/news_page/tabs_for_latest_news';
import NewsList from '@/components/beta/news_page/news_list';
import { useRouter } from 'next/router';
import { NewsType } from '@/constants/news';
import { APIName } from '@/constants/api_connection';
import { INews } from '@/interfaces/news';
import FilterSection from '@/components/filter_section/filter_section';
import { IPaginatedData } from '@/interfaces/pagination';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { useTranslation } from 'next-i18next';

const LatestNewsPageBody = () => {
  const { t } = useTranslation(['dashboard']);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<NewsType>(NewsType.FINANCIAL);
  const [newsList, setNewsList] = useState<INews[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241127 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const router = useRouter();
  const resetUrlPage = () => {
    const query = { ...router.query, page: '1' }; // Info: (20241023 - Liz) 將 page 設為 1
    router.push(
      {
        pathname: router.pathname, // Info: (20241023 - Liz) 保持目前的 path
        query, // Info: (20241023 - Liz) 更新 query 參數
      },
      undefined,
      { shallow: true }
    ); // Info: (20241023 - Liz) 使用 shallow 避免重新整理頁面
  };

  interface PaginationRef {
    resetTargetPage: () => void;
  }
  const paginationRef = useRef<PaginationRef>(null);

  const resetPagination = () => {
    if (paginationRef.current) {
      paginationRef.current.resetTargetPage();
    }
  };

  const resetPage = () => {
    setCurrentPage(1);
    resetPagination(); // Info: (20241127 - Liz) 重置 Pagination 元件的頁碼
    resetUrlPage(); // Info: (20241127 - Liz) 重置 URL 頁碼
    setRefreshKey((prev) => prev + 1); // Info: (20241127 - Liz) refresh FilterSection component to retrigger the API call
  };

  const handleApiResponse = (resData: IPaginatedData<INews[]>) => {
    setNewsList(resData.data);
    setTotalPages(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <main className="flex min-h-full flex-col gap-lv-6 tablet:gap-40px">
      {/* Info: (20250526 - Julian) Mobile title */}
      <p className="block text-base font-semibold text-text-neutral-secondary tablet:hidden">
        {t('dashboard:LATEST_NEWS_PAGE.LATEST_NEWS')}
      </p>

      <FilterSection<INews[]>
        key={refreshKey}
        apiName={APIName.NEWS_LIST}
        onApiResponse={handleApiResponse}
        types={[type]}
        page={currentPage}
        pageSize={DEFAULT_PAGE_LIMIT}
        displayTypeFilter
      />

      <TabsForLatestNews activeTab={type} setActiveTab={setType} isPageStyle callBack={resetPage} />

      <NewsList newsList={newsList} isPageStyle />

      <Pagination
        ref={paginationRef}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </main>
  );
};

export default LatestNewsPageBody;
