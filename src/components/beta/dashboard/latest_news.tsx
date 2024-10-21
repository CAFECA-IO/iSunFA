import React, { useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { RiCoinsFill } from 'react-icons/ri';
import { TbDatabaseSmile } from 'react-icons/tb';
import { FiUserCheck } from 'react-icons/fi';
import Link from 'next/link';

interface TabsProps {
  activeTab: React.SetStateAction<number>;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
}
const Tabs = ({ activeTab, setActiveTab }: TabsProps) => {
  const tabs = [
    { id: 0, name: 'Financial', icon: <RiCoinsFill size={20} /> },
    { id: 1, name: 'System', icon: <TbDatabaseSmile size={20} /> },
    { id: 2, name: 'Matching', icon: <FiUserCheck size={20} /> },
  ];

  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);
  };

  return (
    <div className="flex justify-between">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleTabClick(tab.id)}
          className={`flex items-center gap-8px border-b-2 px-12px py-8px ${tab.id === activeTab ? 'border-b-tabs-stroke-active text-tabs-text-active' : 'border-b-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover'}`}
        >
          {tab.icon}
          <p className="text-base font-medium">{tab.name}</p>
        </button>
      ))}
    </div>
  );
};

interface NewsListProps {
  list: {
    id: string;
    title: string;
    href: string;
    date: string;
  }[];
}
const NewsList = ({ list }: NewsListProps) => {
  return (
    <section className="flex flex-col gap-24px">
      {list.map((news) => (
        <div
          key={news.id}
          className="flex items-center justify-between gap-16px rounded-xs bg-surface-brand-primary-10 p-8px"
        >
          <p className="flex-none text-sm font-normal text-text-neutral-mute">{news.date}</p>

          <p className="flex-auto truncate text-base font-semibold text-surface-brand-secondary">
            {news.title}
          </p>

          <Link href={news.href} className="flex-none text-sm font-semibold text-link-text-primary">
            See More
          </Link>
        </div>
      ))}
    </section>
  );
};

const LatestNews = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  /* === Fake Data === */
  // Deprecated: (20241018 - Liz) 這是假資料，之後會改成從 user context 打 API 拿資料
  const financialNews = [
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
  ];

  const systemNews = [
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
  ];

  const matchingNews = [
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
      title: 'Netflix 上傳相關憑證，徵求記帳士開立傳票',
      href: '/',
      date: '2024/09/09',
    },
  ];

  let newsList: { id: string; title: string; href: string; date: string }[] = [];

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
          <MoreLink href={'/'} />
        </section>

        {/* Tab */}
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* News List */}
        <NewsList list={newsList} />
      </section>
    </DashboardCardLayout>
  );
};

export default LatestNews;
