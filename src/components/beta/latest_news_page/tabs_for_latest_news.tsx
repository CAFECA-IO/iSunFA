import { RiCoinsFill } from 'react-icons/ri';
import { TbDatabaseSmile } from 'react-icons/tb';
import { FiUserCheck } from 'react-icons/fi';

interface TabsProps {
  activeTab: React.SetStateAction<number>;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
  isPageStyle?: boolean;
  callBack?: (() => void) | undefined;
}

const TabsForLatestNews = ({ activeTab, setActiveTab, isPageStyle, callBack }: TabsProps) => {
  const tabs = [
    { id: 0, name: 'Financial', icon: <RiCoinsFill size={20} /> },
    { id: 1, name: 'System', icon: <TbDatabaseSmile size={20} /> },
    { id: 2, name: 'Matching', icon: <FiUserCheck size={20} /> },
  ];

  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);

    if (callBack) {
      callBack();
    }
  };

  return (
    <div className={`flex justify-between ${isPageStyle ? 'gap-40px' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleTabClick(tab.id)}
          className={`flex ${isPageStyle ? 'flex-auto' : ''} items-center justify-center gap-8px border-b-2 px-12px py-8px ${tab.id === activeTab ? 'border-b-tabs-stroke-active text-tabs-text-active' : 'border-b-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover'}`}
        >
          {tab.icon}
          <p className="text-base font-medium">{tab.name}</p>
        </button>
      ))}
    </div>
  );
};

export default TabsForLatestNews;
