import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaArrowLeft } from 'react-icons/fa';
import { PiCopySimpleBold } from 'react-icons/pi';
import { LuTag } from 'react-icons/lu';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { IJournal } from '@/interfaces/journal';
import { useGlobalCtx } from '@/contexts/global_context';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import { ISUNFA_ROUTE } from '@/constants/url';
import { timestampToString } from '@/lib/utils/common';
import { MessageType } from '@/interfaces/message_modal';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';

interface IJournalDetailPageProps {
  journalId: string;
}

interface IVoucherItem {
  id: string;
  accounting: string;
  particulars: string;
  debit: number;
  credit: number;
}

enum VoucherItem {
  ACCOUNTING = 'Accounting',
  PARTICULARS = 'Particulars',
  DEBIT = 'Debit',
  CREDIT = 'Credit',
}

const JournalDetailPage = ({ journalId }: IJournalDetailPageProps) => {
  const router = useRouter();
  const { selectedCompany } = useUserCtx();
  const {
    previewInvoiceModalDataHandler,
    previewInvoiceModalVisibilityHandler,
    messageModalDataHandler,
    messageModalVisibilityHandler,
  } = useGlobalCtx();
  const {
    data: journalDetail,
    isLoading,
    // error,
    success,
    code,
  } = APIHandler<IJournal>(APIName.JOURNAL_GET_BY_ID, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID, journalId },
  });

  useEffect(() => {
    if (success === false && isLoading === false) {
      // Info: (20240517 - Julian) If get journal detail failed, show error message modal
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Journal Detail Failed',
        content: `Error code: ${code}`,
        subMsg: 'Get journal detail failed',
        submitBtnStr: 'Go back to journal list',
        hideCloseBtn: true,
        submitBtnFunction: () => {
          router.push(ISUNFA_ROUTE.JOURNAL_LIST);
        },
      });
      messageModalVisibilityHandler();
    }
  }, [success, isLoading]);

  const tokenContract = journalDetail ? journalDetail.tokenContract : '';
  const tokenId: string = journalDetail ? journalDetail.tokenId : '';
  const type: string = journalDetail ? journalDetail.metaData[0].voucherType : '';
  const dateTimestamp: number = journalDetail ? journalDetail.metaData[0].date / 1000 : 0;
  const reason: string = journalDetail ? journalDetail.metaData[0].reason : '';
  const vendor: string = journalDetail ? journalDetail.metaData[0].companyName : '';
  const description: string = journalDetail ? journalDetail.metaData[0].description : '';
  const totalPrice: number = journalDetail ? journalDetail.metaData[0].payment.price : 0; // Info Murky Edit (20240509)
  const tax: number = journalDetail ? journalDetail.metaData[0].payment.taxPercentage : 0; // Info Murky Edit (20240509)
  const fee: number = journalDetail ? journalDetail.metaData[0].payment.fee : 0; // Info Murky Edit (20240509)
  const paymentMethod: string = journalDetail
    ? journalDetail.metaData[0].payment.paymentMethod
    : ''; // Info Murky Edit (20240509)
  const paymentPeriod: string = journalDetail
    ? journalDetail.metaData[0].payment.paymentPeriod
    : ''; // Info Murky Edit (20240509)
  const paymentStatus: string = journalDetail
    ? journalDetail.metaData[0].payment.paymentStatus
    : ''; // Info Murky Edit (20240509)
  const project: string = journalDetail ? journalDetail.metaData[0].project : '';
  const contract: string = journalDetail ? journalDetail.metaData[0].contract : '';
  const invoiceIndex: string = journalDetail ? journalDetail.invoiceIndex : '';

  const lineItems = journalDetail ? journalDetail.lineItems : [];

  const voucherList: IVoucherItem[] = lineItems.map((lineItem) => {
    return {
      id: lineItem.lineItemIndex,
      accounting: lineItem.account,
      particulars: lineItem.description,
      debit: lineItem.debit ? lineItem.amount : 0,
      credit: !lineItem.debit ? lineItem.amount : 0,
    };
  });

  // Info: (20240503 - Julian) Filter debit and credit
  const debitList = lineItems
    .filter((voucher) => voucher.debit)
    .map((lineItem) => {
      return {
        id: lineItem.lineItemIndex,
        accounting: lineItem.account,
        particulars: lineItem.description,
        debit: lineItem.amount,
        credit: 0,
      };
    });

  const creditList = lineItems
    .filter((voucher) => !voucher.debit)
    .map((lineItem) => {
      return {
        id: lineItem.lineItemIndex,
        accounting: lineItem.account,
        particulars: lineItem.description,
        debit: 0,
        credit: lineItem.amount,
      };
    });

  const invoicePreviewSrc = `/api/v1/company/1/invoice/${invoiceIndex}/image`;

  const copyTokenContractHandler = () => {
    navigator.clipboard.writeText(tokenContract);
  };
  const copyTokenIdHandler = () => {
    navigator.clipboard.writeText(tokenId);
  };

  const invoicePreviewClickHandler = () => {
    previewInvoiceModalDataHandler({
      date: dateTimestamp,
      imgStr: invoicePreviewSrc,
    });
    previewInvoiceModalVisibilityHandler();
  };

  const displayJournalType =
    type === 'Payment' ? (
      <div className="flex w-full items-center justify-center gap-5px rounded-full bg-errorRed2 px-10px py-6px text-sm font-medium text-errorRed">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.651 4.0539C11.5183 4.37419 11.2058 4.58303 10.8591 4.58303H8.85911V7.72589C8.85911 8.19927 8.47535 8.58303 8.00196 8.58303C7.52857 8.58303 7.14482 8.19927 7.14482 7.72589V4.58303H5.14482C4.79814 4.58303 4.48559 4.37419 4.35292 4.0539C4.22025 3.7336 4.29359 3.36493 4.53873 3.11979L7.39587 0.262648C7.7306 -0.0720871 8.27331 -0.072087 8.60806 0.262648L11.4652 3.1198C11.7103 3.36493 11.7837 3.7336 11.651 4.0539ZM0.169321 9.68831C0.276485 9.58115 0.42183 9.52094 0.573382 9.52094H4.03242C4.48707 9.52094 4.92311 9.70156 5.2446 10.023C5.56609 10.3445 5.74671 10.7806 5.74671 11.2352C5.74671 12.3286 6.82843 13.1986 7.99934 13.2065C9.20328 13.2146 10.3181 12.3487 10.3181 11.2352C10.3181 10.7806 10.4987 10.3445 10.8202 10.023C11.1417 9.70156 11.5777 9.52094 12.0325 9.52094H15.4305C15.5821 9.52094 15.7274 9.58115 15.8346 9.68831C15.9417 9.79548 16.002 9.94083 16.002 10.0924V14.2868C16.002 14.7416 15.8214 15.1776 15.4999 15.4991C15.1784 15.8206 14.7423 16.0011 14.2877 16.0011H1.71624C1.26158 16.0011 0.825546 15.8206 0.504056 15.4991C0.182565 15.1776 0.00195312 14.7416 0.00195312 14.2868V10.0924C0.00195312 9.94083 0.062157 9.79548 0.169321 9.68831Z"
            fill="#C84949"
          />
        </svg>
        <p>Payment</p>
      </div>
    ) : type === 'Receiving' ? (
      <div className="flex w-fit items-center justify-center gap-5px rounded-full bg-successGreen2 px-10px py-6px text-sm font-medium text-successGreen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.00194 0.0117188C8.47534 0.0117188 8.85908 0.395475 8.85908 0.868861V4.01172H10.8591C11.2058 4.01172 11.5183 4.22056 11.651 4.54084C11.7837 4.86114 11.7103 5.22981 11.4652 5.47496L8.60803 8.3321C8.2733 8.66683 7.73058 8.66683 7.39585 8.3321L4.53871 5.47496C4.29356 5.22981 4.22024 4.86114 4.3529 4.54084C4.48558 4.22056 4.79811 4.01172 5.1448 4.01172H7.1448V0.868861C7.1448 0.395475 7.52856 0.0117188 8.00194 0.0117188ZM0.169321 9.68829C0.276485 9.58113 0.42183 9.52092 0.573382 9.52092H4.03242C4.48707 9.52092 4.92311 9.70154 5.2446 10.023C5.56609 10.3445 5.74671 10.7806 5.74671 11.2352C5.74671 12.3285 6.82843 13.1986 7.99934 13.2065C9.20328 13.2146 10.3181 12.3487 10.3181 11.2352C10.3181 10.7806 10.4987 10.3445 10.8202 10.023C11.1417 9.70154 11.5777 9.52092 12.0325 9.52092H15.4305C15.5821 9.52092 15.7274 9.58113 15.8346 9.68829C15.9417 9.79546 16.002 9.94081 16.002 10.0924V14.2868C16.002 14.7416 15.8214 15.1776 15.4999 15.4991C15.1784 15.8205 14.7423 16.0011 14.2877 16.0011H1.71624C1.26158 16.0011 0.825546 15.8205 0.504056 15.4991C0.182565 15.1776 0.00195312 14.7416 0.00195312 14.2868V10.0924C0.00195312 9.94081 0.062157 9.79546 0.169321 9.68829Z"
            fill="#3CA876"
          />
        </svg>
        <p>Receiving</p>
      </div>
    ) : type === 'Transfer' ? (
      <div className="flex w-fit items-center justify-center gap-5px rounded-full bg-lightGray3 px-10px py-6px text-sm font-medium text-navyBlue">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.14481 0.000976562C9.60705 0.000976562 10.0238 0.279425 10.2007 0.706482C10.3776 1.13354 10.2798 1.6251 9.95294 1.95196L8.46598 3.43891L15.6662 10.6204C16.113 11.0661 16.114 11.7898 15.6682 12.2366C15.2225 12.6835 14.4989 12.6844 14.052 12.2387L3.74846 1.96194C3.30156 1.5162 3.30062 0.792587 3.74635 0.345693C3.8426 0.249185 3.95183 0.173474 4.06841 0.118567C4.22241 0.0426824 4.39449 0.000976562 4.57338 0.000976562H9.14481ZM7.52857 12.5724L0.336688 5.38053C-0.109625 4.93421 -0.109625 4.2106 0.336688 3.76428C0.783002 3.31797 1.50662 3.31797 1.95294 3.76428L9.95294 11.7643L12.2386 14.05C12.4422 14.2535 12.5529 14.5147 12.5708 14.781C12.5759 14.8556 12.5736 14.9308 12.5639 15.0058C12.536 15.221 12.4469 15.4297 12.2966 15.6038C12.2666 15.6387 12.2346 15.6716 12.2008 15.7023C11.9975 15.8883 11.7431 15.9874 11.4854 15.9997C11.4671 16.0005 11.4488 16.001 11.4305 16.001H6.8591C6.39686 16.001 5.98012 15.7226 5.80323 15.2955C5.62634 14.8684 5.72412 14.3769 6.05097 14.05L7.52857 12.5724Z"
            fill="#002462"
          />
        </svg>
        <p>Transfer</p>
      </div>
    ) : null;

  const displayType = <p className="text-lightRed">{type}</p>;

  const displayDate = <p>{timestampToString(dateTimestamp).date}</p>;

  const displayReason = (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>{reason}</p>
      <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
        <LuTag size={14} />
        Printer
      </div>
    </div>
  );

  const displayVendor = <p className="font-semibold text-navyBlue2">{vendor}</p>;

  const displayDescription = <p className="font-semibold text-navyBlue2">{description}</p>;

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">{totalPrice}</span> TWD
      </p>
      <p>
        (<span className="font-semibold text-navyBlue2">{tax}%</span> Tax /{' '}
        <span className="font-semibold text-navyBlue2">{fee}</span> TWD fee)
      </p>
    </div>
  );

  const displayMethod = <p className="text-right font-semibold text-navyBlue2">{paymentMethod}</p>;

  const displayPeriod = <p className="font-semibold text-navyBlue2">{paymentPeriod}</p>;

  const displayStatus = <p className="font-semibold text-navyBlue2">{paymentStatus}</p>;

  // Info: (20240503 - Julian) Get first letter of each word
  const projectCode = project.split(' ').reduce((acc, word) => acc + word[0], '');
  const displayProject =
    project !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
        <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
          {projectCode}
        </div>
        <p>{project}</p>
      </div>
    ) : (
      <p className="font-semibold text-navyBlue2">None</p>
    );

  const displayContract = <p className="font-semibold text-darkBlue">{contract}</p>;

  const createVoucherLayout = (dataType: VoucherItem) => {
    const displayList = voucherList.map((voucher) => {
      const str =
        dataType === VoucherItem.ACCOUNTING
          ? voucher.accounting
          : dataType === VoucherItem.PARTICULARS
            ? voucher.particulars
            : dataType === VoucherItem.DEBIT
              ? voucher.debit
              : voucher.credit;
      return (
        <div key={voucher.id} className="overflow-x-auto rounded-sm bg-white px-12px py-10px">
          <p className="w-9/10 whitespace-nowrap">{str}</p>
        </div>
      );
    });
    return <div className="mt-8px flex w-9/10 flex-col gap-24px">{displayList}</div>;
  };

  const displayVoucherAccounting = createVoucherLayout(VoucherItem.ACCOUNTING);
  const displayVoucherParticulars = createVoucherLayout(VoucherItem.PARTICULARS);
  const displayVoucherDebit = createVoucherLayout(VoucherItem.DEBIT);
  const displayVoucherCredit = createVoucherLayout(VoucherItem.CREDIT);

  const displayVoucherDesktop = (
    <div className="hidden w-full flex-col gap-24px overflow-x-auto text-base text-lightGray5 md:flex">
      {/* Info: (20240503 - Julian) Divider */}
      <div className="flex items-center gap-4">
        <hr className="flex-1 border-lightGray3" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
          <p>Accounting Voucher</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>
      {/* Info: (20240503 - Julian) List */}
      <div className="rounded-sm bg-lightGray3 p-20px">
        <div className="flex w-full text-left text-navyBlue2">
          {/* Info: (20240503 - Julian) Accounting */}
          <div className="w-1/4">
            <p>Accounting</p>
            {displayVoucherAccounting}
          </div>
          {/* Info: (20240503 - Julian) Particulars */}
          <div className="w-1/4">
            <p>Particulars</p>
            {displayVoucherParticulars}
          </div>
          {/* Info: (20240503 - Julian) Debit */}
          <div className="w-1/4">
            <p>Debit</p>
            {displayVoucherDebit}
          </div>
          {/* Info: (20240503 - Julian) Credit */}
          <div className="w-1/4">
            <p>Credit</p>
            {displayVoucherCredit}
          </div>
        </div>
      </div>
    </div>
  );

  const displayDebitList = debitList.map((debit) => {
    return (
      <div className="mx-auto flex max-w-300px flex-col gap-y-16px rounded-sm bg-lightGray3 p-20px">
        {/* Info: (20240508 - Julian) Accounting */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Accounting</p>
          <div className="w-full overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{debit.accounting}</p>
          </div>
        </div>
        {/* Info: (20240508 - Julian) Particulars */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Particulars</p>
          <div className="w-full overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{debit.particulars}</p>
          </div>
        </div>
        {/* Info: (20240508 - Julian) amount */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Debit</p>
          <div className="overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{debit.debit}</p>
          </div>
        </div>
      </div>
    );
  });

  const displayCreditList = creditList.map((credit) => {
    return (
      <div className="mx-auto flex max-w-300px flex-col gap-y-16px rounded-sm bg-lightGray3 p-20px">
        {/* Info: (20240508 - Julian) Accounting */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Accounting</p>
          <div className="overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{credit.accounting}</p>
          </div>
        </div>
        {/* Info: (20240508 - Julian) Particulars */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Particulars</p>
          <div className="overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{credit.particulars}</p>
          </div>
        </div>
        {/* Info: (20240508 - Julian) amount */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-navyBlue2">Credit</p>
          <div className="overflow-x-auto rounded-sm bg-white px-12px py-10px">
            <p className="whitespace-nowrap">{credit.credit}</p>
          </div>
        </div>
      </div>
    );
  });

  const displayVoucherMobile = (
    <div className="flex flex-col gap-32px text-sm text-lightGray5 md:hidden">
      <div className="flex flex-col gap-32px">
        {/* Info: (20240508 - Julian) Debit divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-lightGray3" />
          <div className="flex items-center gap-2 text-sm">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Debit</p>
          </div>
          <hr className="flex-1 border-lightGray3" />
        </div>
        {/* Info: (20240508 - Julian) Debit list */}
        {displayDebitList}
      </div>

      <div className="flex flex-col gap-32px">
        {/* Info: (20240508 - Julian) Credit divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-lightGray3" />
          <div className="flex items-center gap-2 text-sm">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Credit</p>
          </div>
          <hr className="flex-1 border-lightGray3" />
        </div>
        {/* Info: (20240508 - Julian) Credit list */}
        {displayCreditList}
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240503 - Julian) i18n */}
        <title>Journal {journalId} - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240503 - Julian) Sidebar */}
          <AccountingSidebar />
          {/* Info: (20240503 - Julian) Overview */}
          <div className="flex h-full w-full bg-gray-100">
            <div className="mt-100px flex-1 md:ml-80px">
              <div className="flex min-h-screen w-full flex-col px-16px pb-80px pt-32px md:p-40px">
                {/* Info: (20240503 - Julian) Title */}
                <div className="flex h-45px items-center gap-24px">
                  <Link
                    href={ISUNFA_ROUTE.JOURNAL_LIST}
                    className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
                  >
                    <FaArrowLeft />
                  </Link>
                  <h1 className="flex gap-4px text-base font-semibold text-lightGray5 md:text-4xl">
                    <span className="hidden md:block">View Journal - </span>
                    {journalId}
                  </h1>
                </div>
                {/* Info: (20240503 - Julian) Divider */}
                <hr className="my-20px w-full border-lightGray6" />
                {/* Info: (20240503 - Julian) Journal detail */}
                <div className="flex flex-col py-10px">
                  <div className="flex flex-col items-start gap-x-80px md:flex-row md:items-center">
                    {/* Info: (20240503 - Julian) Token Contract */}
                    <div className="flex flex-wrap items-center text-base text-lightGray4">
                      <div className="flex flex-col items-start gap-x-20px md:flex-row md:items-center">
                        <div className="flex items-center">
                          <p>Token Contract</p>
                          <button
                            type="button"
                            onClick={copyTokenContractHandler}
                            className="block p-10px text-secondaryBlue md:hidden"
                          >
                            <PiCopySimpleBold size={16} />
                          </button>
                        </div>

                        <p className="break-all text-darkBlue">{tokenContract}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyTokenContractHandler}
                        className="hidden p-10px text-secondaryBlue md:block"
                      >
                        <PiCopySimpleBold size={16} />
                      </button>
                    </div>
                    {/* Info: (20240503 - Julian) Token ID */}
                    <div className="flex flex-col items-start text-base text-lightGray4 md:flex-row md:items-center">
                      <div className="flex flex-col items-start gap-x-20px md:flex-row md:items-center">
                        <div className="flex items-center">
                          <p>Token ID</p>
                          <button
                            type="button"
                            onClick={copyTokenIdHandler}
                            className="block p-10px text-secondaryBlue md:hidden"
                          >
                            <PiCopySimpleBold size={16} />
                          </button>
                        </div>
                        <p className=" text-darkBlue">{tokenId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyTokenIdHandler}
                        className="hidden p-10px text-secondaryBlue md:block"
                      >
                        <PiCopySimpleBold size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="my-40px flex w-full flex-col items-center justify-between gap-40px md:flex-row">
                    {/* Info: (20240503 - Julian) certificate */}
                    <div className="flex w-fit flex-col gap-y-30px">
                      <button
                        type="button"
                        onClick={invoicePreviewClickHandler}
                        className="border border-lightGray6"
                      >
                        <Image src={invoicePreviewSrc} width={236} height={300} alt="certificate" />
                      </button>
                      {displayJournalType}
                    </div>
                    {/* Info: (20240503 - Julian) details */}
                    <div className="flex w-full flex-col gap-12px text-base text-lightGray5 md:w-2/3">
                      {/* Info: (20240503 - Julian) Type */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Type</p>
                        {displayType}
                      </div>
                      {/* Info: (20240507 - Julian) Date */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Date</p>
                        {displayDate}
                      </div>
                      {/* Info: (20240503 - Julian) Reason */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Reason</p>
                        {displayReason}
                      </div>
                      {/* Info: (20240503 - Julian) Vendor/Supplier */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Vendor/Supplier</p>
                        {displayVendor}
                      </div>
                      {/* Info: (20240503 - Julian) Description */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Description</p>
                        {displayDescription}
                      </div>
                      {/* Info: (20240503 - Julian) Total Price */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p className="whitespace-nowrap">Total Price</p>
                        {displayTotalPrice}
                      </div>
                      {/* Info: (20240503 - Julian) Payment Method */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p className="whitespace-nowrap">Payment Method</p>
                        {displayMethod}
                      </div>
                      {/* Info: (20240503 - Julian) Payment Period */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p className="whitespace-nowrap">Payment Period</p>
                        {displayPeriod}
                      </div>
                      {/* Info: (20240503 - Julian) Payment Status */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p className="whitespace-nowrap">Payment Status</p>
                        {displayStatus}
                      </div>
                      {/* Info: (20240503 - Julian) Project */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Project</p>
                        {displayProject}
                      </div>
                      {/* Info: (20240503 - Julian) Contract */}
                      <div className="flex items-center justify-between gap-x-10px">
                        <p>Contract</p>
                        {displayContract}
                      </div>
                    </div>
                  </div>
                  {/* Info: (20240503 - Julian) Accounting Voucher */}
                  {displayVoucherDesktop}
                  {displayVoucherMobile}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.journalId || typeof params.journalId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      journalId: params.journalId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default JournalDetailPage;
