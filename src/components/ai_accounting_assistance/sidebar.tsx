import React, { useState } from 'react';
import { FiLayout, FiLogIn } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';
import { numberWithCommas } from '@/lib/utils/common';
import InvoiceItem from '@/components/ai_accounting_assistance/invoice_item';

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
  // ToDo: (20251014 - Julian) Replace mock data with real data from backend
  const invoiceData = mockInvoiceList;
  const invoiceCount = numberWithCommas(invoiceData.length);

  const invoiceList = invoiceData.map((invoice) => ({ ...invoice, isSelected: false }));

  const [uiInvoiceList, setUiInvoiceList] = useState(invoiceList);

  const loginBtn = (
    <Link href={ISUNFA_ROUTE.LOGIN}>
      <Button type="button" size={isOpen ? 'default' : 'defaultSquare'} className="w-full">
        {isOpen ? 'Log in' : <FiLogIn size={20} />}
      </Button>
    </Link>
  );

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
        <p className="text-sm font-medium text-text-neutral-tertiary">
          {invoiceCount} Certificates
        </p>
        {/* ToDo: (20251014 - Julian) Develop Filter section */}
        <div className="flex items-center"></div>
        {/* Info: (20251015 - Julian) Invoice List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-8px">
            {displayedInvoices}
            {displayedInvoices}
            {displayedInvoices}
          </div>
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
      {displayedList}
    </div>
  );

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
      {isOpen && (
        <div className="flex flex-col items-center gap-8px">
          <p className="text-xs font-normal text-text-neutral-tertiary">iSunFA 2024 Beta V1.0.0</p>
          <p className="text-sm font-semibold text-link-text-primary">Support</p>
          <div className="flex items-center gap-8px">
            <p className="text-sm font-semibold text-link-text-primary">Private Policy</p>
            <hr className="h-full w-px border border-stroke-neutral-quaternary" />
            <p className="text-sm font-semibold text-link-text-primary">Service Term</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AAASidebar;
