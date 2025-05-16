import { Dispatch, SetStateAction } from 'react';
import { RiCoinsFill } from 'react-icons/ri';
import { TbDatabaseSmile } from 'react-icons/tb';
import { FiUserCheck } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { NewsType } from '@/constants/news';
import { cn } from '@/lib/utils/common';

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
    <div
      className={cn('flex justify-between', {
        'gap-40px': isPageStyle,
        'gap-8px': !isPageStyle,
      })}
    >
      {TABS_ICON.map((tab) => (
        <button
          key={tab.name}
          type="button"
          onClick={() => handleTabClick(tab.name)}
          className={cn(
            'flex min-w-0 flex-auto items-center justify-center gap-8px border-b-2 px-12px py-8px',
            {
              'border-b-tabs-stroke-active text-tabs-text-active': tab.name === activeTab,
              'border-b-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover':
                tab.name !== activeTab,
            }
          )}
        >
          {tab.icon}

          <span className="hidden text-base font-medium tablet:block">
            {t(`dashboard:DASHBOARD.${tab.name.toUpperCase()}`)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default TabsForLatestNews;
