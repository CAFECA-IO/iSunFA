import React, { useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { ISUNFA_ROUTE } from '@/constants/url';
import TabsForLatestNews from '@/components/beta/latest_news_page/tabs_for_latest_news';
import NewsList from '@/components/beta/latest_news_page/news_list';
import { NewsType } from '@/constants/news';

const LatestNews = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  /* === Fake Data === */
  // Deprecated: (20241018 - Liz) 這是假資料，之後會改成從 user context 打 API 拿資料
  const financialNews = [
    {
      id: 'financial-1',
      title: '遇到金融詐騙免驚 移民署培力新住民金融消費新知',
      type: NewsType.FINANCIAL,
      date: '2024/09/13',
    },
    {
      id: 'financial-2',
      title: '凱基證券重視公平待客、友善金融',
      type: NewsType.FINANCIAL,
      date: '2024/09/12',
    },
    {
      id: 'financial-3',
      title: '華航志工到偏鄉2萬童樂學航空新知',
      type: NewsType.FINANCIAL,
      date: '2024/09/11',
    },
    {
      id: 'financial-4',
      title: '你在滑手機、追劇 他們正在汲取新知、思考未來！',
      type: NewsType.FINANCIAL,
      date: '2024/09/10',
    },
    {
      id: 'financial-5',
      title: 'ESG時代－金融業該如何落實責任投資？',
      type: NewsType.FINANCIAL,
      date: '2024/09/09',
    },
  ];

  const systemNews = [
    {
      id: 'system-1',
      title: 'iSunFA V.14.10 更新版本',
      type: NewsType.SYSTEM,
      date: '2024/09/13',
    },
    {
      id: 'system-2',
      title: 'iSunFA V.14.10 更新通知',
      type: NewsType.SYSTEM,
      date: '2024/09/12',
    },
    {
      id: 'system-3',
      title: 'iSunFA V.14.09 實裝小提醒',
      type: NewsType.SYSTEM,
      date: '2024/09/11',
    },
    {
      id: 'system-4',
      title: 'iSunFA V.14.09 新功能重點整理',
      type: NewsType.SYSTEM,
      date: '2024/09/10',
    },
    {
      id: 'system-5',
      title: 'iSunFA V.14.09 懶人包一次看',
      type: NewsType.SYSTEM,
      date: '2024/09/09',
    },
  ];

  const matchingNews = [
    {
      id: 'system-1',
      title: 'Amazon 上傳相關憑證，徵求記帳士開立傳票',
      type: NewsType.MATCH,
      date: '2024/09/13',
    },
    {
      id: 'system-2',
      title: 'Apple 上傳相關憑證，徵求記帳士開立傳票',
      type: NewsType.MATCH,
      date: '2024/09/12',
    },
    {
      id: 'system-3',
      title: 'iSunFA V.14.09 實裝小提醒',
      type: NewsType.MATCH,
      date: '2024/09/11',
    },
    {
      id: 'system-4',
      title: 'Google 上傳相關憑證，徵求記帳士開立傳票',
      type: NewsType.MATCH,
      date: '2024/09/10',
    },
    {
      id: 'system-5',
      title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票 5',
      type: NewsType.MATCH,
      date: '2024/09/09',
    },
  ];

  let newsList: { id: string; title: string; type: string; date: string }[] = [];

  switch (activeTab) {
    case 0:
      newsList = financialNews;
      break;
    case 1:
      newsList = systemNews;
      break;
    case 2:
      newsList = matchingNews;
      break;
    default:
      newsList = [];
  }

  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-24px">
        <section className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-neutral-secondary">Latest News</h1>
          <MoreLink href={ISUNFA_ROUTE.LATEST_NEWS_PAGE} />
        </section>

        {/* Tab */}
        <TabsForLatestNews activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* News List */}
        <NewsList list={newsList} />
      </section>
    </DashboardCardLayout>
  );
};

export default LatestNews;
