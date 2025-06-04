import React from 'react';

interface TabProps {
  tabs: string[];
  tabsString: string[];
  activeTab: string;
  onTabClick: (tab: string) => void;
  counts: number[];
}

const Tabs: React.FC<TabProps> = ({ tabs, tabsString, activeTab, onTabClick, counts }) => {
  const displayTab = tabs.map((tab, index) => {
    const countStr = counts[index] > 100 ? '99+' : counts[index].toString();

    return (
      <button
        type="button"
        key={`tab-${index + 1}`}
        className={`inline-flex w-1/2 items-center justify-center gap-2 border-b-2 px-12px py-8px font-medium tracking-tight transition-all duration-300 ease-in-out ${activeTab === tab ? 'border-tabs-stroke-active' : 'border-tabs-stroke-default'}`}
        onClick={() => onTabClick(tab)}
      >
        <p
          className={`flex items-center gap-4px whitespace-nowrap text-xs leading-normal tablet:text-base ${activeTab === tab ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
        >
          {tabsString[index]}
        </p>
        <div className="rounded-full bg-badge-surface-soft-primary px-8px py-2px text-xs tracking-tight text-badge-text-primary-solid">
          {countStr}
        </div>
      </button>
    );
  });

  return <div className="my-4 inline-flex w-full items-center justify-center">{displayTab}</div>;
};

export default Tabs;
