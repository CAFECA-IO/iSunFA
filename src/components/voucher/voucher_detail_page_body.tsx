import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiTrash2, FiEdit, FiBookOpen } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { generateRandomCertificates, ICertificateUI } from '@/interfaces/certificate';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/certificate';
import CertificateSelection from '@/components/certificate/certificate_selection';
import { Button } from '@/components/button/button';
import { timestampToString, numberWithCommas } from '@/lib/utils/common';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import Skeleton from '@/components/skeleton/skeleton';
import { WEEK_FULL_LIST } from '@/constants/display';
import { ToastType } from '@/interfaces/toastify';
import { FREE_COMPANY_ID } from '@/constants/config';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IVoucherDetailForFrontend } from '@/interfaces/voucher';

// Info: (20241014 - Julian) @Murky Interface for Voucher Detail
// Info: (20241105 - Murky) @Julian IVoucherDetailForFrontend 搬到 interface/voucher
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
  payableInfo: undefined,
  receivingInfo: undefined,
  reverseVoucherIds: [],
  assets: [],
  certificates: [],
  lineItemsInfo: {
    lineItems: [],
  },
};

const VoucherDetailPageBody: React.FC<{ voucherId: string }> = () => {
  const { t } = useTranslation(['common', 'journal']);
  const router = useRouter();

  const { selectedCompany } = useUserCtx();

  const params = {
    companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
    voucherId: '123', // ToDo: (20241029 - Julian) Replace with real voucherId
  };

  // Info: (20241029 - Julian) Get voucher details from API
  const { data: voucherData, isLoading } = APIHandler<IVoucherDetailForFrontend>(
    APIName.VOUCHER_GET_BY_ID_V2,
    { params },
    true
  );

  // Info: (20241029 - Julian) Delete voucher API
  const {
    trigger: deleteVoucher,
    isLoading: isDeleting,
    success: deleteSuccess,
    error: deleteError,
  } = APIHandler(APIName.VOUCHER_DELETE_V2, { params });

  const {
    voucherDate,
    type,
    note,
    counterParty,
    recurringInfo,
    payableInfo,
    receivingInfo,
    reverseVoucherIds,
    assets,
    certificates,
    lineItemsInfo: { lineItems },
  } = voucherData || defaultVoucherDetail;
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();

  const totalDebit = lineItems.reduce((acc, cur) => (cur.debit ? acc + cur.amount : acc), 0);
  const totalCredit = lineItems.reduce((acc, cur) => (!cur.debit ? acc + cur.amount : acc), 0);

  // Info: (20241014 - Julian) Destructuring payableInfo or receivingInfo
  const {
    total: payableAmount,
    alreadyHappened: paidAmount,
    remain: remainAmount,
  } = payableInfo ||
    receivingInfo || { payableAmount: undefined, paidAmount: undefined, remainAmount: undefined };

  const displayDaysOfWeek = recurringInfo.daysOfWeek
    .map((day) => t(WEEK_FULL_LIST[day]))
    .join(', ');

  const recurringStr = t('journal:ADD_NEW_VOUCHER.EVERY') + displayDaysOfWeek; // ToDo: (20241014 - Julian) Replace with real recurring string
  const recurringPeriodStr = `${t('common:COMMON.FROM')} ${timestampToString(recurringInfo.startDate).date} ${t('common:COMMON.TO')} ${timestampToString(recurringInfo.endDate).date}`;

  // ToDo: (20241016 - Julian) Call API to undo delete voucher
  const undoDeleteVoucher = async () => {
    // eslint-disable-next-line no-console
    console.log('Voucher restored');
  };

  const deleteClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('journal:VOUCHER_DETAIL_PAGE.DELETE_MESSAGE_TITLE'),
      content: t('journal:VOUCHER_DETAIL_PAGE.DELETE_MESSAGE_CONTENT'),
      submitBtnStr: t('journal:VOUCHER_DETAIL_PAGE.DELETE_MESSAGE_SUBMIT_BTN'),
      submitBtnFunction: deleteVoucher,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  // ToDo: (20241014 - Julian) dummy data
  const selectedCertificates: ICertificateUI[] = generateRandomCertificates(
    certificates.length
  ).map((certificate) => {
    const actions = [
      CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
      CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
    ];
    return {
      ...certificate,
      isSelected: false,
      actions,
    };
  });

  useEffect(() => {
    if (!isDeleting) {
      if (deleteSuccess) {
        // Info: (20241029 - Julian) 刪除成功後，跳轉至列表頁，並顯示成功 toast
        router.push(ISUNFA_ROUTE.VOUCHER_LIST);
        toastHandler({
          id: 'delete-voucher-toast',
          type: ToastType.SUCCESS,
          content: (
            <div className="flex items-center justify-between">
              <p className="text-text-neutral-primary">
                {t('journal:VOUCHER_DETAIL_PAGE.DELETE_SUCCESS_TOAST')}
              </p>
              <button
                type="button"
                onClick={undoDeleteVoucher}
                className="font-semibold text-link-text-success"
              >
                {t('journal:VOUCHER_DETAIL_PAGE.UNDO')}
              </button>
            </div>
          ),
          closeable: true,
        });
      } else if (deleteError) {
        toastHandler({
          id: 'delete-voucher-toast',
          type: ToastType.ERROR,
          content: t('journal:VOUCHER_DETAIL_PAGE.DELETE_FAIL_TOAST'),
          closeable: true,
        });
      }
    }
  }, [isDeleting, deleteSuccess]);

  const voucherLineBlock = lineItems.map((lineItem) => (
    <>
      <div
        key={`${lineItem.account?.id}-account`}
        className="flex items-center justify-between gap-8px rounded-sm bg-input-surface-input-background px-12px py-10px"
      >
        <p className="overflow-x-auto whitespace-nowrap">
          {lineItem.account?.id} - {lineItem.account?.name}
        </p>
        <div className="h-20px w-20px">
          <FiBookOpen size={20} />
        </div>
      </div>
      <div
        id={`${lineItem.account?.id}-description`}
        className="rounded-sm bg-input-surface-input-background px-12px py-10px"
      >
        {lineItem.description}
      </div>
      <div
        id={`${lineItem.account?.id}-debit`}
        className="rounded-sm bg-input-surface-input-background px-12px py-10px text-right"
      >
        {lineItem.debit ? (
          numberWithCommas(lineItem.amount)
        ) : (
          <p className="text-input-text-input-placeholder">0</p>
        )}
      </div>
      <div
        id={`${lineItem.account?.id}-credit`}
        className="rounded-sm bg-input-surface-input-background px-12px py-10px text-right"
      >
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

  const isDisplayRecurringEntry = !isLoading ? (
    <div className="flex flex-col text-right">
      <p className="text-input-text-primary">{recurringStr}</p>
      <p className="text-input-text-primary">{recurringPeriodStr}</p>
    </div>
  ) : (
    <Skeleton width={200} height={48} rounded />
  );

  const isDisplayReverseVoucher = !isLoading ? (
    <div className="flex flex-col">
      {reverseVoucherIds.map((reverseVoucher) => (
        <p key={reverseVoucher.id} className="text-link-text-primary">
          {reverseVoucher.voucherNo}
        </p>
      ))}
    </div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayPayableAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(payableAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayPaidAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(paidAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayRemainAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(remainAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  // ToDo: (20241014 - Julian) should display asset name
  const isDisplayAsset = !isLoading ? (
    <div className="flex flex-col">
      {assets.map((asset) => (
        <p key={asset.id} className="text-link-text-primary">
          {asset.id}
        </p>
      ))}
    </div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isPayableAmount =
    payableAmount !== undefined ? (
      <div className="flex justify-between">
        <p className="text-text-neutral-tertiary">
          {t('journal:VOUCHER_DETAIL_PAGE.PAYABLE_AMOUNT')}
        </p>
        {isDisplayPayableAmount}
      </div>
    ) : null;

  const isPaidAmount =
    paidAmount !== undefined ? (
      <div className="flex justify-between">
        <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_DETAIL_PAGE.PAID_AMOUNT')}</p>
        {isDisplayPaidAmount}
      </div>
    ) : null;

  const isRemainAmount =
    remainAmount !== undefined ? (
      <div className="flex justify-between">
        <p className="text-text-neutral-tertiary">
          {t('journal:VOUCHER_DETAIL_PAGE.REMAIN_AMOUNT')}
        </p>
        {isDisplayRemainAmount}
      </div>
    ) : null;

  const isReverseVoucher =
    reverseVoucherIds.length > 0 ? (
      <div className="flex justify-between">
        <p className="text-text-neutral-tertiary">
          {t('journal:VOUCHER_DETAIL_PAGE.REVERSE_VOUCHERS')}
        </p>
        {isDisplayReverseVoucher}
      </div>
    ) : null;

  const isAsset =
    assets.length > 0 ? (
      <div className="flex justify-between">
        <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_DETAIL_PAGE.ASSET')}</p>
        {isDisplayAsset}
      </div>
    ) : null;

  return (
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
          <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_DETAIL_PAGE.DATE')}</p>
          {isDisplayDate}
        </div>
        {/* Info: (20241007 - Julian) Voucher type */}
        <div className="flex justify-between">
          <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_DETAIL_PAGE.TYPE')}</p>
          {isDisplayType}
        </div>
        {/* Info: (20241007 - Julian) Note */}
        <div className="flex justify-between">
          <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_DETAIL_PAGE.NOTE')}</p>
          {isDisplayNote}
        </div>
        {/* Info: (20241007 - Julian) Counterparty */}
        <div className="flex justify-between">
          <p className="text-text-neutral-tertiary">
            {t('journal:VOUCHER_DETAIL_PAGE.COUNTERPARTY')}
          </p>
          {isDisplayCounterParty}
        </div>
        {/* Info: (20241007 - Julian) Recurring Entry */}
        <div className="flex justify-between">
          <p className="text-text-neutral-tertiary">
            {t('journal:VOUCHER_DETAIL_PAGE.RECURRING_ENTRY')}
          </p>
          {isDisplayRecurringEntry}
        </div>
        {/* Info: (20241007 - Julian) Payable Amount */}
        {isPayableAmount}
        {/* Info: (20241007 - Julian) Paid Amount */}
        {isPaidAmount}
        {/* Info: (20241007 - Julian) Remain Amount */}
        {isRemainAmount}
        {/* Info: (20241007 - Julian) Reverse Vouchers */}
        {isReverseVoucher}
        {/* Info: (20241007 - Julian) Asset */}
        {isAsset}
      </div>

      {/* Info: (20241008 - Julian) Voucher Line Block */}
      <div className="mt-40px flex flex-col gap-8px rounded-md bg-surface-brand-secondary-soft px-24px py-12px">
        {/* Info: (20241008 - Julian) Voucher Line Header */}
        <div className="grid grid-cols-4 gap-24px font-semibold text-text-neutral-solid-dark">
          <p>{t('journal:VOUCHER_DETAIL_PAGE.ACCOUNTING')}</p>
          <p>{t('journal:VOUCHER_DETAIL_PAGE.PARTICULARS')}</p>
          <p>{t('journal:VOUCHER_DETAIL_PAGE.DEBIT')}</p>
          <p>{t('journal:VOUCHER_DETAIL_PAGE.CREDIT')}</p>
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
  );
};

export default VoucherDetailPageBody;
