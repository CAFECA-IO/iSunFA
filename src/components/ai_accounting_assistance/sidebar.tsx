import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaRegCheckCircle } from 'react-icons/fa';
import { FiLayout, FiLogIn } from 'react-icons/fi';
import { LuArchive } from 'react-icons/lu';
import { PiSliders } from 'react-icons/pi';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import Toggle from '@/components/toggle/toggle';
import InvoiceItem from '@/components/ai_accounting_assistance/invoice_item';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { ISUNFA_ROUTE } from '@/constants/url';
import { default30DayPeriodInSec } from '@/constants/display';
import { numberWithCommas } from '@/lib/utils/common';
import { useUserCtx } from '@/contexts/user_context';
import { IDatePeriod } from '@/interfaces/date_period';

enum InvoiceTab {
  DRAFT = 'draft',
  DONE = 'done',
}

interface ISidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

// ToDo: (20251014 - Julian) During development
interface IInvoiceItem {
  id: number;
  name: string;
  thumbnail: string;
  unread: boolean;
}

const mockInvoiceList: IInvoiceItem[] = [
  {
    id: 1,
    name: 'Invoice 001',
    thumbnail: '/public/images/fake_avatar.png',
    unread: false,
  },
  {
    id: 2,
    name: 'Invoice 002',
    thumbnail: '/public/images/fake_avatar.png',
    unread: false,
  },
  {
    id: 3,
    name: 'Invoice 003',
    thumbnail: '/public/images/fake_avatar.png',
    unread: true,
  },
];

const AAASidebar: React.FC<ISidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { isSignIn } = useUserCtx();

  const {
    targetRef: sortRef,
    componentVisible: isSortOpen,
    setComponentVisible: setIsSortOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // ToDo: (20251014 - Julian) Replace mock data with real data from backend
  const invoiceData: IInvoiceItem[] = mockInvoiceList;
  const invoiceCount = numberWithCommas(invoiceData.length);

  // ToDo: (20251021 - Julian) 目前先用 string 儲存排序選項，之後再改成其他更合適的型別
  const sortByOptions = [
    'Invoice Date: New →Old',
    'Invoice Date: Old →New',
    'Upload Date: New →Old',
    'Upload Date: Old →New',
  ];

  const invoiceList = invoiceData.map((invoice) => ({ ...invoice, isSelected: false }));

  const [uiInvoiceList, setUiInvoiceList] = useState(invoiceList);
  const [currentTab, setCurrentTab] = useState<InvoiceTab>(InvoiceTab.DRAFT);
  const [selectedPeriod, setSelectedPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [isShownOnlyIncomplete, setIsShownOnlyIncomplete] = useState<boolean>(false);
  // ToDo: (20251021 - Julian) Develop sorting function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortBy, setSortBy] = useState<string>(sortByOptions[0]);

  const toggleSortDropdown = () => setIsSortOpen((prev) => !prev);
  const toggleShownOnlyIncomplete = () => setIsShownOnlyIncomplete((prev) => !prev);

  // Info: (20251015 - Julian) 點擊 invoice item 事件
  const clickInvoice = (id: number) => {
    // Info: (20251015 - Julian) 找到目前點擊的 item 狀態
    const selected = uiInvoiceList.find((invoice) => invoice.id === id)?.isSelected;

    const newInvoiceList = uiInvoiceList.map((invoice) => ({
      ...invoice,
      // Info: (20251015 - Julian) 找到被點擊的 item 後，將狀態反轉，其他 item 狀態不變
      isSelected: invoice.id === id ? !selected : invoice.isSelected,
    }));
    setUiInvoiceList(newInvoiceList);
  };

  const displayedTabs = isSignIn && (
    <div className="grid grid-cols-2 gap-8px">
      {Object.values(InvoiceTab).map((tab) => {
        const isActive = currentTab === tab;
        const icon =
          tab === InvoiceTab.DRAFT ? (
            <LuArchive size={20} className="shrink-0" />
          ) : (
            <FaRegCheckCircle size={20} className="shrink-0" />
          );
        const clickHandler = () => setCurrentTab(tab);

        return (
          <button
            type="button"
            key={tab}
            onClick={clickHandler}
            className={` ${isActive ? 'border-tabs-stroke-active text-tabs-text-active' : 'border-tabs-stroke-default text-tabs-text-default'} flex items-center gap-8px border-b-2 px-12px py-8px text-base font-medium`}
          >
            {icon}
            <p>{tab}</p>
          </button>
        );
      })}
    </div>
  );

  const loginBtn = !isSignIn && (
    <Link href={ISUNFA_ROUTE.LOGIN}>
      <Button type="button" size={isOpen ? 'default' : 'defaultSquare'} className="w-full">
        {isOpen ? 'Log in' : <FiLogIn size={20} />}
      </Button>
    </Link>
  );

  const displayedSortOptions = sortByOptions.map((option) => {
    const clickHandler = () => {
      setSortBy(option);
      setIsSortOpen(false);
    };
    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-8px text-left text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
      >
        {option}
      </button>
    );
  });

  const displayedSortDropdown = isSortOpen && (
    <div
      ref={sortRef}
      className="absolute right-0 top-50px z-10 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M"
    >
      <p className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
        Sort by
      </p>
      {displayedSortOptions}
      <hr className="m-8px border-t border-divider-stroke-lv-4" />
      <div className="flex items-center justify-between gap-8px px-12px py-8px text-xs font-medium text-switch-text-primary">
        <p>Show Incomplete Only</p>
        <Toggle
          id="show_incomplete_only_toggle"
          toggleStateFromParent={isShownOnlyIncomplete}
          getToggledState={toggleShownOnlyIncomplete}
        />
      </div>
    </div>
  );

  const displayedInvoices = uiInvoiceList.map((invoice) => {
    const clickHandler = () => clickInvoice(invoice.id);
    return (
      <InvoiceItem
        key={invoice.id}
        invoice={invoice}
        isSelected={invoice.isSelected}
        clickHandler={clickHandler}
      />
    );
  });

  const displayedList =
    uiInvoiceList.length > 0 ? (
      // Info: (20251015 - Julian) min-h-0 ➡️ 讓 list 可以撐滿剩餘空間，讓 overflow-y-auto 正常運作
      <div className="flex min-h-0 flex-col gap-8px">
        {/* Info: (20251021 - Julian) Develop Filter section */}
        <div className="relative flex items-center gap-4px">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={selectedPeriod}
            setFilteredPeriod={setSelectedPeriod}
            calenderClassName="scale-75 w-250px md:scale-60 origin-top-left"
            buttonStyleAfterDateSelected="w-100px truncate"
          />
          <button
            type="button"
            onClick={toggleSortDropdown}
            className="p-12px text-button-text-secondary hover:text-button-text-secondary-hover"
          >
            <PiSliders size={24} />
          </button>

          {displayedSortDropdown}
        </div>
        <p className="text-sm font-medium text-text-neutral-tertiary">
          {invoiceCount} Certificates
        </p>
        {/* Info: (20251015 - Julian) Invoice List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-8px">{displayedInvoices}</div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center">
        <p className="text-center text-sm font-medium text-text-neutral-tertiary">
          No Certificate found Please upload the certificate
        </p>
      </div>
    );

  const displayedContent = isOpen && (
    // Info: (20251015 - Julian) min-h-0 ➡️ 讓 list 可以撐滿剩餘空間，讓 overflow-y-auto 正常運作
    <div className="flex min-h-0 flex-1 flex-col gap-32px">
      <p className="text-sm font-semibold uppercase text-text-neutral-tertiary">Invoice List</p>
      {/* Info: (20251015 - Julian) Tabs */}
      {displayedTabs}
      {displayedList}
    </div>
  );

  const displayedCopyright = (
    <div className="flex flex-col items-center gap-8px">
      <p className="text-xs font-normal text-text-neutral-tertiary">iSunFA 2024 Beta V1.0.0</p>
      <p className="text-sm font-semibold text-link-text-primary">Support</p>
      <div className="flex items-center gap-8px">
        <p className="text-sm font-semibold text-link-text-primary">Private Policy</p>
        <hr className="h-full w-px border border-stroke-neutral-quaternary" />
        <p className="text-sm font-semibold text-link-text-primary">Service Term</p>
      </div>
    </div>
  );

  // ToDo: (20251015 - Julian) Develop UserInfo component
  const displayedFooter =
    isOpen &&
    (isSignIn ? (
      <>
        {/* Info: (20251015 - Julian) 實體高度 */}
        <div className="h-40px"></div>
        {/* Info: (20251015 - Julian) UserInfo 內容 */}
        <div className="absolute bottom-0 left-0 h-80px w-full border-t border-stroke-neutral-quaternary p-12px">
          <div className="flex items-center gap-24px">
            <div className="h-64px w-64px shrink-0 overflow-hidden rounded-full">
              <Image
                src="/images/fake_company_avatar.svg"
                width={64}
                height={64}
                alt="user_avatar"
              />
            </div>
            <div className="flex flex-col">
              <p className="text-base font-semibold text-text-neutral-primary">User name</p>
              <p className="text-xs font-normal text-text-neutral-secondary">user@abc.com</p>
            </div>
          </div>
        </div>
      </>
    ) : (
      displayedCopyright
    ));

  return (
    <div
      className={`${isOpen ? 'w-250px px-16px' : 'w-70px px-12px'} fixed flex h-screen flex-col gap-32px bg-surface-neutral-surface-lv1 py-16px transition-all duration-200 ease-in-out`}
    >
      {/* Info: (20251014 - Julian) Header */}
      <button type="button" onClick={toggleSidebar} className="group flex items-center gap-8px">
        <div className="mx-auto shrink-0">
          <Image src="/logo/isunfa_logo_new_icon.svg" width={28} height={28} alt="iSunFA_logo" />
        </div>
        {isOpen && (
          <>
            <p className="flex-1 text-left font-semibold text-text-brand-primary-lv2">FinPilot</p>
            <FiLayout
              size={24}
              className="text-button-text-secondary hover:text-button-text-primary-hover group-hover:text-button-text-primary-hover"
            />
          </>
        )}
      </button>

      {/* Info: (20251014 - Julian) Body */}
      <div className="flex flex-1 flex-col items-stretch gap-32px overflow-hidden">
        {/* Info: (20251014 - Julian) Login button */}
        {loginBtn}

        {/* Info: (20251014 - Julian) Content */}
        {displayedContent}
      </div>

      {/* Info: (20251014 - Julian) Footer */}
      {displayedFooter}
    </div>
  );
};

export default AAASidebar;
