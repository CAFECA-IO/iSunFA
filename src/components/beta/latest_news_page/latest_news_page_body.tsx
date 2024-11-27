import { useState, useRef, useEffect } from 'react';
// import FilterSection from '@/components/filter_section/filter_section'; // ToDo: (20241023 - Liz) 使用共用元件代替 Search
import Pagination from '@/components/pagination/pagination';
import TabsForLatestNews from '@/components/beta/latest_news_page/tabs_for_latest_news';
import NewsList from '@/components/beta/latest_news_page/news_list';
import { useRouter } from 'next/router';
import { NewsType } from '@/constants/news';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { INews } from '@/interfaces/news';

const LatestNewsPageBody = () => {
  const [currentPage, setCurrentPage] = useState(1);
  // const [financialNews, setFinancialNews] = useState(FINANCIAL_NEWS);
  // const [systemNews, setSystemNews] = useState(SYSTEM_NEWS);
  // const [matchingNews, setMatchingNews] = useState(MATCHING_NEWS);
  const [type, setType] = useState<NewsType>(NewsType.FINANCIAL);
  const [newsList, setNewsList] = useState<INews[]>([]);

  // Info: (20241126 - Liz) 打 API 取得最新消息列表
  const { trigger: getNewsListAPI } = APIHandler<INews[]>(APIName.NEWS_LIST);

  // Info: (20241126 - Liz) 取得最新消息列表 (根據不同的 type)
  useEffect(() => {
    const getNewsList = async () => {
      try {
        const { data, success, code } = await getNewsListAPI({
          query: { simple: true, type },
        });

        if (success && data) {
          setNewsList(data);

          // Deprecated: (20241126 - Liz)
          // eslint-disable-next-line no-console
          console.log('getNewsListAPI success:', 'data:', data);
        } else {
          // Deprecated: (20241126 - Liz)
          // eslint-disable-next-line no-console
          console.log('getNewsListAPI failed:', code);
        }
      } catch (error) {
        // Deprecated: (20241126 - Liz)
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };

    getNewsList();
  }, [type]);

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
    resetPagination();
    resetUrlPage();
  };

  const itemsPerPage = 10;
  const totalItems = newsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const slicedNewsList = newsList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // let totalPages = 0;

  // switch (activeTab) {
  //   case 0:
  //     newsList = slicedFinancialNews;
  //     totalPages = totalPagesForFinancialNews;
  //     break;
  //   case 1:
  //     newsList = slicedSystemNews;
  //     totalPages = totalPagesForSystemNews;
  //     break;
  //   case 2:
  //     newsList = slicedMatchingNews;
  //     totalPages = totalPagesForMatchingNews;
  //     break;
  //   default:
  //     break;
  // }

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="h-44px bg-gray-500">
        Date Picker & Search (Todo : use common components)
      </section>

      <TabsForLatestNews activeTab={type} setActiveTab={setType} isPageStyle callBack={resetPage} />

      <div className="flex-auto">
        <NewsList newsList={slicedNewsList} isPageStyle />
      </div>

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
