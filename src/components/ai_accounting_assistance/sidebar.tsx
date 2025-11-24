import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaRegCheckCircle } from 'react-icons/fa';
import { FiLayout, FiLogIn } from 'react-icons/fi';
import { LuArchive } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import InvoiceList, { SORT_BY_OPTIONS } from '@/components/ai_accounting_assistance/invoice_list';
import { ISUNFA_ROUTE } from '@/constants/url';
import { default30DayPeriodInSec } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { IDatePeriod } from '@/interfaces/date_period';
import { IFaithCertificate } from '@/interfaces/faith';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

enum InvoiceTab {
  DRAFT = 'draft',
  DONE = 'done',
}

interface ISidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeInvoiceId: string;
  clickInvoiceHandler: (invoiceId: string) => void;
}

const AAASidebar: React.FC<ISidebarProps> = ({
  isOpen,
  toggleSidebar,
  activeInvoiceId,
  clickInvoiceHandler,
}) => {
  const { isSignIn } = useUserCtx();

  // ToDo: (20251121 - Julian) 目前先用固定的 sessionId
  const params = { sessionId: '123' };

  const { trigger: getInvoiceList } = APIHandler<IFaithCertificate[]>(
    APIName.LIST_CERTIFICATE_BY_FAITH_SESSION_ID,
    { params }
  );

  const [currentTab, setCurrentTab] = useState<InvoiceTab>(InvoiceTab.DRAFT);
  const [selectedPeriod, setSelectedPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  // ToDo: (20251021 - Julian) Develop sorting function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortBy, setSortBy] = useState<string>(SORT_BY_OPTIONS[0]);
  const [invoiceData, setInvoiceData] = useState<IFaithCertificate[]>([]);

  useEffect(() => {
    // Info: (20251121 - Julian) 取得發票列表
    const getInvoices = async () => {
      const { data } = await getInvoiceList({ params });
      // Info: (20251121 - Julian) 將取得的發票列表轉成 IInvoiceData 格式
      setInvoiceData(data ?? []);
    };

    getInvoices();
  }, []);

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
            className={`${isActive ? 'border-tabs-stroke-active text-tabs-text-active' : 'border-tabs-stroke-default text-tabs-text-default'} flex items-center gap-8px border-b-2 px-12px py-8px text-base font-medium`}
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

  const displayedList =
    invoiceData.length > 0 ? (
      // Info: (20251015 - Julian) min-h-0 ➡️ 讓 list 可以撐滿剩餘空間，讓 overflow-y-auto 正常運作
      <InvoiceList
        invoiceData={invoiceData}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        activeInvoiceId={activeInvoiceId}
        clickInvoiceHandler={clickInvoiceHandler}
      />
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
        <Link
          href={ISUNFA_ROUTE.PRIVACY_POLICY}
          target="_blank"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover"
        >
          Private Policy
        </Link>
        <hr className="h-full w-px border border-stroke-neutral-quaternary" />
        <Link
          href={ISUNFA_ROUTE.TERMS_OF_SERVICE}
          target="_blank"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover"
        >
          Service Term
        </Link>
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
      className={`${isOpen ? 'w-250px px-16px' : 'w-70px px-12px'} fixed z-10 flex h-screen flex-col gap-32px bg-surface-neutral-surface-lv1 py-16px transition-all duration-200 ease-in-out`}
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
