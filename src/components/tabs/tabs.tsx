import React from 'react';

interface TabProps {
  tabs: string[];
  activeTab: number;
  onTabClick: (index: number) => void;
  counts: number[];
}

const Tabs: React.FC<TabProps> = ({ tabs, activeTab, onTabClick, counts }) => {
  return (
    <div className="my-20px inline-flex w-full items-center justify-center">
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={`tab-${index + 1}`}
          className={`inline-flex w-1/2 items-center justify-center gap-2 border-b-2 px-12px py-8px font-medium tracking-tight transition-all duration-300 ease-in-out ${activeTab === index ? 'border-tabs-stroke-active' : 'border-tabs-stroke-default'}`}
          onClick={() => onTabClick(index)}
        >
          <p
            className={`flex items-center gap-4px whitespace-nowrap text-base leading-normal ${activeTab === index ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
          >
            {tab}
          </p>
          <div className="rounded-full bg-badge-surface-soft-primary px-4px py-2px text-xs tracking-tight text-badge-text-primary-solid">
            {counts[index]}
          </div>
        </button>
      ))}
    </div>
  );
};

export default Tabs;
