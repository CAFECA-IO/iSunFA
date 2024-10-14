import React from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiTrash2, FiEdit, FiBookOpen } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { ILocale } from '@/interfaces/locale';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import {
  generateRandomCertificates,
  ICertificate,
  ICertificateUI,
  OPERATIONS,
} from '@/interfaces/certificate';
import CertificateSelection from '@/components/certificate/certificate_selection';
import { Button } from '@/components/button/button';
import { timestampToString, numberWithCommas } from '@/lib/utils/common';
import { ILineItem, ILineItemBeta } from '@/interfaces/line_item';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import Skeleton from '@/components/skeleton/skeleton';

interface IVoucherDetailForFrontend {
  id: number;
  voucherDate: number;
  type: string;
  note: string;
  counterParty: {
    id: number;
    companyId: number;
    name: string;
  };
  recurringInfo: {
    type: string;
    startDate: number;
    endDate: number;
    daysOfWeek: number[]; // 0~6
    monthsOfYear: string[]; // '1'~'12'
  };
  certificates: ICertificate[];
  lineItemsInfo: {
    lineItems: ILineItemBeta[];
  };
}

const defaultVoucherDetail: IVoucherDetailForFrontend = {
  id: 0,
  voucherDate: 0,
  type: '',
  note: '',
  counterParty: {
    id: 0,
    companyId: 0,
    name: '',
  },
  recurringInfo: {
    type: '',
    startDate: 0,
    endDate: 0,
    daysOfWeek: [],
    monthsOfYear: [],
  },
  certificates: [],
  lineItemsInfo: {
    lineItems: [],
  },
};

const VoucherDetailPage: React.FC = () => {
  const recurringStr: string = 'Every month';

  const payableAmount: number = 1300;
  const paidAmount: number = 1000;
  const remainAmount: number = 300;
  const reverseVouchers: string[] = ['20241008-002', '20241008-003'];
  // ToDo: (20241008 - Julian) Asset
  // const assetIds = ['A00000001', 'A00000002', 'A00000003'];
  const voucherLineItems: ILineItem[] = [
    {
      lineItemIndex: '0',
      accountId: 320,
      account: 'Cash',
      description: 'Buy a printer',
      debit: true,
      amount: 1000,
    },
    {
      lineItemIndex: '1',
      accountId: 503,
      account: 'Accounts Payable',
      description: '',
      debit: false,
      amount: 1300,
    },
    {
      lineItemIndex: '3',
      accountId: 673,
      account: 'Miscellaneous Expense',
      description: '',
      debit: true,
      amount: 300,
    },
  ];

  const { data: voucherData, isLoading } = APIHandler<IVoucherDetailForFrontend>(
    APIName.VOUCHER_GET_BY_ID_V2,
    {
      // ToDo: (20241014 - Julian) Replace with real parameters
      params: {
        companyId: '111',
        voucherId: '123',
      },
    },
    true
  );

  const {
    id: voucherId,
    voucherDate,
    type,
    note,
    counterParty,
    recurringInfo,
    certificates,
  } = voucherData || defaultVoucherDetail;
  const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();

  const pageTitle = `Voucher ${voucherId}`;
  const totalDebit = voucherLineItems.reduce((acc, cur) => (cur.debit ? acc + cur.amount : acc), 0);
  const totalCredit = voucherLineItems.reduce(
    (acc, cur) => (!cur.debit ? acc + cur.amount : acc),
    0
  );

  const recurringPeriodStr = `From ${timestampToString(recurringInfo.startDate).date} to ${timestampToString(recurringInfo.endDate).date}`;

  // ToDo: (20241008 - Julian) Call API to delete voucher
  const deleteVoucher = async () => {
    // eslint-disable-next-line no-console
    console.log('Voucher deleted');
  };

  const deleteClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: 'Do you really want to delete this Voucher?',
      content: 'All the assets that are connected to this voucher will be deleted too.',
      submitBtnStr: 'Yes, delete the voucher.',
      submitBtnFunction: deleteVoucher,
      backBtnStr: 'Cancel',
      backBtnFunction: messageModalVisibilityHandler,
    });
    messageModalVisibilityHandler();
  };

  // ToDo: (20241014 - Julian) dummy data
  const selectedCertificates: ICertificateUI[] = generateRandomCertificates(
    certificates.length
  ).map((certificate) => {
    const actions = [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE];
    return {
      ...certificate,
      isSelected: false,
      actions,
    };
  });

  const reverseVoucherList = reverseVouchers.map((reverseVoucher) => (
    <p key={reverseVoucher} className="text-link-text-primary">
      {reverseVoucher}
    </p>
  ));

  // ToDo: (20241008 - Julian) Display asset
  // const displayAssetIds = assetIds.map((assetId) => (
  //   <p key={assetId} className="text-link-text-primary">
  //     {assetId}
  //   </p>
  // ));

  const voucherLineBlock = voucherLineItems.map((lineItem) => (
    <>
      <div className="flex items-center justify-between gap-8px rounded-sm bg-input-surface-input-background px-12px py-10px">
        <p className="overflow-x-auto whitespace-nowrap">
          {lineItem.accountId} - {lineItem.account}
        </p>
        <div className="h-20px w-20px">
          <FiBookOpen size={20} />
        </div>
      </div>
      <div className="rounded-sm bg-input-surface-input-background px-12px py-10px">
        {lineItem.description}
      </div>
      <div className="rounded-sm bg-input-surface-input-background px-12px py-10px text-right">
        {lineItem.debit ? (
          numberWithCommas(lineItem.amount)
        ) : (
          <p className="text-input-text-input-placeholder">0</p>
        )}
      </div>
      <div className="rounded-sm bg-input-surface-input-background px-12px py-10px text-right">
        {lineItem.debit ? (
          <p className="text-input-text-input-placeholder">0</p>
        ) : (
          numberWithCommas(lineItem.amount)
        )}
      </div>
    </>
  ));

  const isDisplayDate = !isLoading ? (
    <p className="text-input-text-primary">{timestampToString(voucherDate).date}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayType = !isLoading ? (
    <p className="text-input-text-primary">{type}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayNote = !isLoading ? (
    <p className="text-input-text-primary">{note}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayCounterParty = !isLoading ? (
    <p className="text-input-text-primary">{counterParty.name}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>
      <main className="flex h-screen w-screen overflow-hidden">
        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-1 flex-col bg-surface-neutral-main-background">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header />

          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="overflow-y-auto px-40px pb-32px pt-10px">
            <div className="flex justify-end gap-2 p-4">
              <Button id="download-voucher-btn" type="button" variant="tertiary" className="p-2">
                <MdOutlineFileDownload size={16} />
              </Button>
              <Button
                id="delete-voucher-btn"
                type="button"
                variant="tertiary"
                className="p-2"
                onClick={deleteClickHandler}
              >
                <FiTrash2 size={16} />
              </Button>
              <Button id="edit-voucher-btn" type="button" variant="tertiary" className="p-2">
                <FiEdit size={16} />
              </Button>
            </div>
            {/* Info: (20240926 - tzuhan) CertificateSelection */}
            <CertificateSelection
              selectedCertificates={selectedCertificates}
              isSelectable={false}
              isDeletable
            />

            {/* Info: (20241008 - Julian) Voucher Detail */}
            <div className="flex flex-col items-stretch gap-24px font-semibold">
              {/* Info: (20241007 - Julian) Voucher date */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Voucher Date</p>
                {isDisplayDate}
              </div>
              {/* Info: (20241007 - Julian) Voucher type */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Voucher Type</p>
                {isDisplayType}
              </div>
              {/* Info: (20241007 - Julian) Note */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Note</p>
                {isDisplayNote}
              </div>
              {/* Info: (20241007 - Julian) Counterparty */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Counterparty</p>
                {isDisplayCounterParty}
              </div>
              {/* Info: (20241007 - Julian) Recurring Entry */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Recurring Entry</p>
                <div className="flex flex-col text-right">
                  <p className="text-input-text-primary">{recurringStr}</p>
                  <p className="text-input-text-primary">{recurringPeriodStr}</p>
                </div>
              </div>
              {/* Info: (20241007 - Julian) Payable Amount */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Payable Amount</p>
                <p className="text-text-neutral-primary">
                  {numberWithCommas(payableAmount)}
                  <span className="ml-4px text-text-neutral-tertiary">TWD</span>
                </p>
              </div>
              {/* Info: (20241007 - Julian) Paid Amount */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Paid Amount</p>
                <p className="text-text-neutral-primary">
                  {numberWithCommas(paidAmount)}
                  <span className="ml-4px text-text-neutral-tertiary">TWD</span>
                </p>
              </div>
              {/* Info: (20241007 - Julian) Remain Amount */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Remain Amount</p>
                <p className="text-text-neutral-primary">
                  {numberWithCommas(remainAmount)}
                  <span className="ml-4px text-text-neutral-tertiary">TWD</span>
                </p>
              </div>
              {/* Info: (20241007 - Julian) Reverse Vouchers */}
              <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Reverse Vouchers</p>
                <div className="flex flex-col">{reverseVoucherList}</div>
              </div>
              {/* Info: (20241007 - Julian) Asset */}
              {/* <div className="flex justify-between">
                <p className="text-text-neutral-tertiary">Asset</p>
                <div className="flex flex-col">{displayAssetIds}</div>
              </div> */}
            </div>

            {/* Info: (20241008 - Julian) Voucher Line Block */}
            <div className="mt-40px flex flex-col gap-8px rounded-md bg-surface-brand-secondary-soft px-24px py-12px">
              {/* Info: (20241008 - Julian) Voucher Line Header */}
              <div className="grid grid-cols-4 gap-24px font-semibold text-text-neutral-solid-dark">
                <p>Accounting</p>
                <p>Particulars</p>
                <p>Debit</p>
                <p>Credit</p>
              </div>
              {/* Info: (20241008 - Julian) Voucher Line Items */}
              <div className="grid grid-cols-4 gap-24px font-medium text-input-text-input-filled">
                {voucherLineBlock}
              </div>
              {/* Info: (20241008 - Julian) Voucher Line Total */}
              <div className="grid grid-cols-4 gap-24px text-right text-sm text-text-neutral-solid-dark">
                <div className="col-start-3">{numberWithCommas(totalDebit)}</div>
                <div>{numberWithCommas(totalCredit)}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default VoucherDetailPage;
