import { Dispatch, SetStateAction } from 'react';
import { RiCoinsFill } from 'react-icons/ri';
import { TbDatabaseSmile } from 'react-icons/tb';
import { FiUserCheck } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { NewsType } from '@/constants/news';

interface TabsProps {
  activeTab: SetStateAction<NewsType>;
  setActiveTab: Dispatch<SetStateAction<NewsType>>;
  isPageStyle?: boolean;
  callBack?: (() => void) | undefined;
}

const TabsForLatestNews = ({ activeTab, setActiveTab, isPageStyle, callBack }: TabsProps) => {
  const { t } = useTranslation('dashboard');

  const TABS_ICON = [
    { name: NewsType.FINANCIAL, icon: <RiCoinsFill size={20} /> },
    { name: NewsType.SYSTEM, icon: <TbDatabaseSmile size={20} /> },
    { name: NewsType.MATCH, icon: <FiUserCheck size={20} /> },
  ];

  const handleTabClick = (tabName: NewsType) => {
    setActiveTab(tabName);

    if (callBack) {
      callBack();
    }
  };

  return (
    <div className={`flex justify-between ${isPageStyle ? 'gap-40px' : ''}`}>
      {TABS_ICON.map((tab) => (
        <button
          key={tab.name}
          type="button"
          onClick={() => handleTabClick(tab.name)}
          className={`flex ${isPageStyle ? 'flex-auto' : ''} items-center justify-center gap-8px border-b-2 px-12px py-8px ${tab.name === activeTab ? 'border-b-tabs-stroke-active text-tabs-text-active' : 'border-b-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover'}`}
        >
          {tab.icon}

          <p className="text-base font-medium">
            {t(`dashboard:DASHBOARD.${tab.name.toUpperCase()}`)}
          </p>
        </button>
      ))}
    </div>
  );
};

export default TabsForLatestNews;
