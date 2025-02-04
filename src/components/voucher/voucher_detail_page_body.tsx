import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiTrash2, FiEdit, FiBookOpen } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { ICertificateUI } from '@/interfaces/certificate';
import CertificateSelection from '@/components/certificate/certificate_selection';
import { Button } from '@/components/button/button';
import { timestampToString, numberWithCommas } from '@/lib/utils/common';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import Skeleton from '@/components/skeleton/skeleton';
// import { WEEK_FULL_LIST } from '@/constants/display';
import { ToastType } from '@/interfaces/toastify';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IVoucherDetailForFrontend, defaultVoucherDetail } from '@/interfaces/voucher';
import { EVENT_TYPE_TO_VOUCHER_TYPE_MAP, EventType } from '@/constants/account';

interface IVoucherDetailPageBodyProps {
  voucherId: string;
  voucherNo: string | undefined;
}

const VoucherDetailPageBody: React.FC<IVoucherDetailPageBodyProps> = ({ voucherId, voucherNo }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { selectedAccountBook } = useUserCtx();

  const companyId = selectedAccountBook?.id;

  const params = { companyId, voucherId };

  const [certificates, setCertificates] = useState<ICertificateUI[]>([]);

  // Info: (20241029 - Julian) Get voucher details from API
  const {
    trigger: getVoucherDetail,
    data: voucherData,
    isLoading,
    error,
  } = APIHandler<IVoucherDetailForFrontend>(APIName.VOUCHER_GET_BY_ID_V2, { params });

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
    // counterParty,
    payableInfo,
    receivingInfo,
    reverseVoucherIds,
    assets,
    lineItems,
    isReverseRelated,
  } = voucherData || defaultVoucherDetail;
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();

  const totalDebit = lineItems.reduce((acc, cur) => (cur.debit ? acc + cur.amount : acc), 0);
  const totalCredit = lineItems.reduce((acc, cur) => (!cur.debit ? acc + cur.amount : acc), 0);

  // Info: (20241118 - Julian) If note is empty, display '-'
  const noteText = note !== '' ? note : '-';

  // Info: (20241227 - Julian) type 字串轉換
  const translateType = (voucherType: string) => {
    const typeStr = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherType as EventType];

    if (typeStr) {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${typeStr.toUpperCase()}`);
    } else {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${voucherType.toUpperCase()}`);
    }
  };

  // Info: (20241014 - Julian) Destructuring payableInfo or receivingInfo
  const {
    total: payableAmount,
    alreadyHappened: paidAmount,
    remain: remainAmount,
  } = payableInfo ||
    receivingInfo || { payableAmount: undefined, paidAmount: undefined, remainAmount: undefined };

  // ToDo: (20241016 - Julian) Call API to undo delete voucher
  // const undoDeleteVoucher = async () => {
  //   // eslint-disable-next-line no-console
  //   console.log('Voucher restored');
  // };

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

  useEffect(() => {
    // Info: (20241121 - Julian) Get voucher detail when companyId and voucherId are ready
    if (companyId && voucherId) {
      // Deprecated: (20250124 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('API Params:', params); // Info: (20250122 - Anna) 檢查 companyId 和 voucherId 是否正確
      getVoucherDetail();
    }
  }, [companyId, voucherId]);

  useEffect(() => {
    if (voucherData?.certificates) {
      const certificateUIList = voucherData.certificates.map((certificate) => {
        return {
          ...certificate,
          isSelected: false,
          actions: [],
        };
      });

      setCertificates(certificateUIList);
    }
  }, [voucherData]);

  useEffect(() => {
    if (!isDeleting) {
      if (deleteSuccess) {
        // Info: (20241029 - Julian) 刪除成功後，跳轉至列表頁，並顯示成功 toast
        router.push(ISUNFA_ROUTE.VOUCHER_LIST);
        // toastHandler({
        //   id: 'delete-voucher-toast',
        //   type: ToastType.SUCCESS,
        //   content: (
        //     <div className="flex items-center justify-between">
        //       <p className="text-text-neutral-primary">
        //         {t('journal:VOUCHER_DETAIL_PAGE.DELETE_SUCCESS_TOAST')}
        //       </p>
        //       <button
        //         type="button"
        //         onClick={undoDeleteVoucher}
        //         className="font-semibold text-link-text-success"
        //       >
        //         {t('journal:VOUCHER_DETAIL_PAGE.UNDO')}
        //       </button>
        //     </div>
        //   ),
        //   closeable: true,
        // });
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
    <p className="text-input-text-primary">{translateType(type)}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayNote = !isLoading ? (
    <p className="text-input-text-primary">{noteText}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  // const isDisplayCounterParty = !isLoading ? (
  //   <p className="text-input-text-primary">{counterParty.name}</p>
  // ) : (
  //   <Skeleton width={200} height={24} rounded />
  // );

  const isDisplayReverseVoucher = !isLoading ? (
    <div className="flex flex-col">
      {reverseVoucherIds.map((reverseVoucher) => (
        <Link
          key={reverseVoucher.id}
          href={`/users/accounting/${reverseVoucher.id}?voucherNo=${voucherNo}`}
          className="text-link-text-primary hover:underline"
        >
          {reverseVoucher.voucherNo}
        </Link>
      ))}
    </div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayPayableAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(payableAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayPaidAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(paidAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayRemainAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {numberWithCommas(remainAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  // ToDo: (20241014 - Julian) should display asset name
  const isDisplayAsset = !isLoading ? (
    <div className="flex flex-col">
      {assets.map((asset) => (
        <Link
          key={asset.id}
          href={`/users/asset/${asset.id}`}
          className="text-link-text-primary hover:underline"
        >
          {asset.id}
        </Link>
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

  // const isRecurringEntry = recurringInfo ? (
  //   <div className="flex justify-between">
  //     <p className="text-text-neutral-tertiary">
  //       {t('journal:VOUCHER_DETAIL_PAGE.RECURRING_ENTRY')}
  //     </p>
  //     {!isLoading ? (
  //       <div className="flex flex-col text-right">
  //         {/* ToDo: (20241111 - Julian) Replace with real recurring string */}
  //         <p className="text-input-text-primary">
  //           {t('journal:ADD_NEW_VOUCHER.EVERY')}{' '}
  //           {recurringInfo.daysOfWeek.map((day) => t(WEEK_FULL_LIST[day])).join(', ')}
  //         </p>
  //         <p className="text-input-text-primary">
  //           {t('common:COMMON.FROM')} {timestampToString(recurringInfo.startDate).date}{' '}
  //           {t('common:COMMON.TO')} {timestampToString(recurringInfo.endDate).date}
  //         </p>
  //       </div>
  //     ) : (
  //       <Skeleton width={200} height={48} rounded />
  //     )}
  //   </div>
  // ) : null;

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-10px">
        <Image src={'/images/empty.svg'} alt="page_not_found" width={150} height={150} />
        <p className="text-neutral-300">{t('journal:VOUCHER_DETAIL_PAGE.VOUCHER_NOT_FOUND')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-40px pb-32px pt-10px">
      <div className="flex justify-end gap-2 p-4">
        <Button id="download-voucher-btn" type="button" variant="tertiary" size={'defaultSquare'}>
          <MdOutlineFileDownload size={16} />
        </Button>
        <Button
          id="delete-voucher-btn"
          type="button"
          variant="tertiary"
          size={'defaultSquare'}
          onClick={deleteClickHandler}
          disabled={isReverseRelated} // Info: (20250120 - Julian) 被刪除或反轉的傳票不能再次刪除
        >
          <FiTrash2 size={16} />
        </Button>
        <Link href={`/users/accounting/${voucherId}/editing?voucherNo=${voucherNo}`}>
          <Button
            id="edit-voucher-btn"
            type="button"
            variant="tertiary"
            size={'defaultSquare'}
            // Info: (20250120 - Julian) 被刪除或反轉的傳票不能編輯
            // ToDo: (20250122 - Julian) 先不開放手動開帳的編輯功能
            disabled={isReverseRelated || type === EventType.OPENING}
          >
            <FiEdit size={16} />
          </Button>
        </Link>
      </div>
      {/* Info: (20240926 - tzuhan) CertificateSelection */}
      <CertificateSelection
        selectedCertificates={certificates}
        isSelectable={false}
        isDeletable={false}
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
        {/* ToDo: (20250123 - Julian) 暫時不顯示 */}
        {/* <div className="flex justify-between">
          <p className="text-text-neutral-tertiary">
            {t('journal:VOUCHER_DETAIL_PAGE.COUNTERPARTY')}
          </p>
          {isDisplayCounterParty}
        </div> */}
        {/* Info: (20241007 - Julian) Recurring Entry */}
        {/* {isRecurringEntry} */}
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
