import { useState, useRef } from 'react';
// import FilterSection from '@/components/filter_section/filter_section'; // ToDo: (20241023 - Liz) 使用共用元件代替 Search
import Pagination from '@/components/pagination/pagination';
import TabsForLatestNews from '@/components/beta/latest_news_page/tabs_for_latest_news';
import NewsList from '@/components/beta/latest_news_page/news_list';
import { useRouter } from 'next/router';

/* === Fake Data === */
// Deprecated: (20241023 - Liz) 這是假資料，之後會改成從 user context 打 API 拿資料
const FINANCIAL_NEWS = [
  {
    id: 'financial-1',
    title: '遇到金融詐騙免驚 移民署培力新住民金融消費新知',
    href: '/',
    date: '2024/09/13',
  },
  {
    id: 'financial-2',
    title: '凱基證券重視公平待客、友善金融',
    href: '/',
    date: '2024/09/12',
  },
  {
    id: 'financial-3',
    title: '華航志工到偏鄉2萬童樂學航空新知',
    href: '/',
    date: '2024/09/11',
  },
  {
    id: 'financial-4',
    title: '你在滑手機、追劇 他們正在汲取新知、思考未來！',
    href: '/',
    date: '2024/09/10',
  },
  {
    id: 'financial-5',
    title: 'ESG時代－金融業該如何落實責任投資？',
    href: '/',
    date: '2024/09/09',
  },
  {
    id: 'financial-6',
    title: '中信金表態續戰中新併！新壽副董洪士琪4聲明挺「新新併」：維持現狀即是落伍',
    href: '/',
    date: '2024/09/08',
  },
  {
    id: 'financial-7',
    title: '股票分拆是什麼？為何企業要「拆股」？一文看懂背後3種考量',
    href: '/',
    date: '2024/09/07',
  },
  {
    id: 'financial-8',
    title: '打造亞洲資產管理中心！彭金隆曬5計畫拚「6年有感」：讓台灣人願意留在台灣理財',
    href: '/',
    date: '2024/09/06',
  },
  {
    id: 'financial-9',
    title: '全支付進軍日本，2個步驟大賺30%回饋！',
    href: '/',
    date: '2024/09/05',
  },
  {
    id: 'financial-10',
    title: '金融亂鬥！台新金遞件公平會申請新新併，5點聲明轟中信金「干擾合意併購」',
    href: '/',
    date: '2024/09/04',
  },
  {
    id: 'financial-11',
    title: '新聞11',
    href: '/',
    date: '2024/09/03',
  },
  {
    id: 'financial-12',
    title: '新聞12',
    href: '/',
    date: '2024/09/02',
  },
];

const SYSTEM_NEWS = [
  {
    id: 'system-1',
    title: 'iSunFA V.14.10 更新版本',
    href: '/',
    date: '2024/09/13',
  },
  {
    id: 'system-2',
    title: 'iSunFA V.14.10 更新通知',
    href: '/',
    date: '2024/09/12',
  },
  {
    id: 'system-3',
    title: 'iSunFA V.14.09 實裝小提醒',
    href: '/',
    date: '2024/09/11',
  },
  {
    id: 'system-4',
    title: 'iSunFA V.14.09 新功能重點整理',
    href: '/',
    date: '2024/09/10',
  },
  {
    id: 'system-5',
    title: 'iSunFA V.14.09 懶人包一次看',
    href: '/',
    date: '2024/09/09',
  },
  {
    id: 'system-6',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/08',
  },
  {
    id: 'system-7',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/07',
  },
  {
    id: 'system-8',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/06',
  },
  {
    id: 'system-9',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/05',
  },
  {
    id: 'system-10',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/04',
  },
  {
    id: 'system-11',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/03',
  },
  {
    id: 'system-12',
    title: 'iSunFA V.14.09 新功能上線',
    href: '/',
    date: '2024/09/02',
  },
];

const MATCHING_NEWS = [
  {
    id: 'system-1',
    title: 'Amazon 上傳相關憑證，徵求記帳士開立傳票',
    href: '/',
    date: '2024/09/13',
  },
  {
    id: 'system-2',
    title: 'Apple 上傳相關憑證，徵求記帳士開立傳票',
    href: '/',
    date: '2024/09/12',
  },
  {
    id: 'system-3',
    title: 'iSunFA V.14.09 實裝小提醒',
    href: '/',
    date: '2024/09/11',
  },
  {
    id: 'system-4',
    title: 'Google 上傳相關憑證，徵求記帳士開立傳票',
    href: '/',
    date: '2024/09/10',
  },
  {
    id: 'system-5',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 5',
    href: '/',
    date: '2024/09/09',
  },
  {
    id: 'system-6',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 6',
    href: '/',
    date: '2024/09/08',
  },
  {
    id: 'system-7',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 7',
    href: '/',
    date: '2024/09/07',
  },
  {
    id: 'system-8',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 8',
    href: '/',
    date: '2024/09/06',
  },
  {
    id: 'system-9',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 9',
    href: '/',
    date: '2024/09/05',
  },
  {
    id: 'system-10',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 10',
    href: '/',
    date: '2024/09/04',
  },
  {
    id: 'system-11',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 11',
    href: '/',
    date: '2024/09/03',
  },
  {
    id: 'system-12',
    title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 12',
    href: '/',
    date: '2024/09/02',
  },
];

const LatestNewsPageBody = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [financialNews, setFinancialNews] = useState(FINANCIAL_NEWS);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [systemNews, setSystemNews] = useState(SYSTEM_NEWS);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchingNews, setMatchingNews] = useState(MATCHING_NEWS);

  const router = useRouter();

  const resetUrlPage = () => {
    const query = { ...router.query, page: '1' }; // 將 page 設為 1
    router.push(
      {
        pathname: router.pathname, // 保持目前的 path
        query, // 更新 query 參數
      },
      undefined,
      { shallow: true }
    ); // 使用 shallow 避免重新整理頁面
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
  const totalItemsForFinancialNews = financialNews.length;
  const totalPagesForFinancialNews = Math.ceil(totalItemsForFinancialNews / itemsPerPage);
  const slicedFinancialNews = financialNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalItemsForSystemNews = systemNews.length;
  const totalPagesForSystemNews = Math.ceil(totalItemsForSystemNews / itemsPerPage);
  const slicedSystemNews = systemNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalItemsForMatchingNews = matchingNews.length;
  const totalPagesForMatchingNews = Math.ceil(totalItemsForMatchingNews / itemsPerPage);
  const slicedMatchingNews = matchingNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  let newsList: { id: string; title: string; href: string; date: string }[] = [];

  let totalPages = 0;

  switch (activeTab) {
    case 0:
      newsList = slicedFinancialNews;
      totalPages = totalPagesForFinancialNews;
      break;
    case 1:
      newsList = slicedSystemNews;
      totalPages = totalPagesForSystemNews;
      break;
    case 2:
      newsList = slicedMatchingNews;
      totalPages = totalPagesForMatchingNews;
      break;
    default:
      break;
  }

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="h-44px bg-gray-500">
        Date Picker & Search (Todo : use common components)
      </section>

      <TabsForLatestNews
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPageStyle
        callBack={resetPage}
      />

      <div className="flex-auto">
        <NewsList list={newsList} isPageStyle />
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
