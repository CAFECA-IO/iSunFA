import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TbArrowBackUp } from 'react-icons/tb';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiTrash2, FiEdit, FiBookOpen } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { ICertificateUI } from '@/interfaces/certificate';
import CertificateSelection from '@/components/certificate/certificate_selection';
import { Button } from '@/components/button/button';
import { timestampToString } from '@/lib/utils/common';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { useModalContext } from '@/contexts/modal_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
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
import { AccountCodesOfAPRegex } from '@/constants/asset';
import { IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
import InvoiceSelection from './invoice_selection';

interface IVoucherDetailPageBodyProps {
  voucherId: string;
  voucherNo: string | undefined;
  goBackUrl: string;
}

const VoucherDetailPageBody: React.FC<IVoucherDetailPageBodyProps> = ({
  voucherId,
  voucherNo,
  goBackUrl,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const router = useRouter();
  const { connectedAccountBook } = useUserCtx();
  const { refreshVoucherListHandler } = useAccountingCtx();

  const accountBookId = connectedAccountBook?.id;

  const [certificates, setCertificates] = useState<ICertificateUI[]>([]);
  const [invoices, setInvoices] = useState<IInvoiceRC2UI[]>([]);

  // Info: (20241029 - Julian) Get voucher details from API
  const {
    trigger: getVoucherDetail,
    data: voucherData,
    isLoading,
    error,
  } = APIHandler<IVoucherDetailForFrontend>(APIName.VOUCHER_GET_BY_ID_V2);

  // Info: (20241029 - Julian) Delete voucher API
  const {
    trigger: deleteVoucher,
    isLoading: isDeleting,
    success: deleteSuccess,
    error: deleteError,
  } = APIHandler(
    APIName.VOUCHER_DELETE_V2,
    // { params }
    { params: { accountBookId, voucherId } }
  );

  // Info: (20250221 - Julian) Restore voucher API
  const { trigger: restoreVoucher, isLoading: isRestoring } = APIHandler(
    APIName.VOUCHER_RESTORE_V2,
    // { params }
    { params: { accountBookId, voucherId } }
  );

  const {
    voucherDate,
    type,
    note,
    counterParty,
    payableInfo,
    receivingInfo,
    reverseVoucherIds,
    deletedReverseVoucherIds,
    assets,
    lineItems,
    isReverseRelated,
  } = voucherData || defaultVoucherDetail;

  // Info: (20250205 - Tzuhan) 判斷是否為應收應付款
  const isARandAP = lineItems.some((lineItem) =>
    AccountCodesOfAPRegex.test(lineItem?.account?.code || '')
  );

  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();

  // Info: (20250818 - Shirley) 使用 DecimalOperations 進行精確計算
  const debitAmounts = lineItems.filter((item) => item.debit).map((item) => item.amount);
  const creditAmounts = lineItems.filter((item) => !item.debit).map((item) => item.amount);
  const totalDebit = parseFloat(DecimalOperations.sum(debitAmounts));
  const totalCredit = parseFloat(DecimalOperations.sum(creditAmounts));

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

  // Info: (20250221 - Julian) 恢復刪除的傳票
  const undoDeleteVoucher = async () => {
    const { success } = await restoreVoucher();
    if (success) {
      toastHandler({
        id: 'restore-voucher-toast',
        type: ToastType.SUCCESS,
        content: t('journal:COMMON.RESTORE_SUCCESS_TOAST'),
        closeable: true,
      });
      // Info: (20250221 - Julian) 重新取得傳票列表
      refreshVoucherListHandler();
    } else {
      toastHandler({
        id: 'restore-voucher-toast',
        type: ToastType.ERROR,
        content: t('journal:COMMON.RESTORE_FAIL_TOAST'),
        closeable: true,
      });
    }
  };

  const goBack = () => router.push(goBackUrl);

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
    // Info: (20241121 - Julian) Get voucher detail when accountBookId and voucherId are ready
    if (accountBookId && voucherId) {
      // ToDo: (20250429 - Liz) 目前 API 正在大規模調整參數中，會將 companyId 統一改成 accountBookId，屆時可再把 params 調整回原本的寫法
      getVoucherDetail({ params: { accountBookId, voucherId } });
    }
  }, [accountBookId, voucherId]);

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
    if (voucherData?.invoiceRC2List) {
      const invoiceUIList = voucherData.invoiceRC2List.map((invoice) => {
        return {
          ...invoice,
          isSelected: false,
          actions: [],
        };
      });
      setInvoices(invoiceUIList);
    }
  }, [voucherData]);

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
                disabled={isRestoring}
                className="font-semibold text-link-text-success"
              >
                {t('journal:COMMON.UNDO')}
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
          {lineItem.account?.code} - {lineItem.account?.name}
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
          DecimalOperations.format(lineItem.amount)
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
          DecimalOperations.format(lineItem.amount)
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
    <div className="flex flex-col">
      {note && <p className="text-input-text-primary">{note}</p>}
      {deletedReverseVoucherIds.length > 0 &&
        deletedReverseVoucherIds.map((deletedReverseVoucherId) => (
          <p key={deletedReverseVoucherId.id} className="text-input-text-primary">
            {t('journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER_1')}
            <Link
              href={`/users/accounting/${deletedReverseVoucherId.id}?voucherNo=${deletedReverseVoucherId.voucherNo}`}
              className="px-1 text-link-text-primary"
            >
              {deletedReverseVoucherId.voucherNo}
            </Link>
            {t('journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER_2')}
            {/* <Trans
              i18nKey="journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER"
              values={{ voucherNo: deletedReverseVoucherId.voucherNo }}
              components={{
                link: (
                  <Link
                    href={`/users/accounting/${deletedReverseVoucherId.id}?voucherNo=${deletedReverseVoucherId.voucherNo}`}
                    className="text-link-text-primary"
                  />
                ),
              }}
            /> */}
          </p>
        ))}
      {!note && deletedReverseVoucherIds.length === 0 && (
        <p className="text-input-text-primary">-</p>
      )}
    </div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayCounterParty = !isLoading ? (
    <p className="text-input-text-primary">{`${counterParty.taxId ?? ''} ${counterParty.name ?? '-'}`}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayReverseVoucher = !isLoading ? (
    <div className="flex flex-col">
      {reverseVoucherIds.map((reverseVoucher) => (
        <Link
          key={reverseVoucher.id}
          href={`/users/accounting/${reverseVoucher.id}?voucherNo=${reverseVoucher.voucherNo}`}
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
      {DecimalOperations.format(payableAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayPaidAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {DecimalOperations.format(paidAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  const isDisplayRemainAmount = !isLoading ? (
    <p className="text-input-text-primary">
      {DecimalOperations.format(remainAmount ?? 0)}
      <span className="ml-4px text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  // ToDo: (20241014 - Julian) should display asset name
  const isDisplayAsset = !isLoading ? (
    <div className="flex flex-col">
      {assets.map((asset) => {
        // Info: (20250214 - Julian) 被刪除的資產不顯示連結
        return asset.deletedAt === null ? (
          <Link
            key={asset.id}
            href={`/users/asset/${asset.id}`}
            className="text-link-text-primary hover:underline"
          >
            {asset.id}
          </Link>
        ) : (
          <div key={asset.id} className="text-text-neutral-tertiary">
            {asset.id}
          </div>
        );
      })}
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
          {t(
            `journal:VOUCHER_DETAIL_PAGE.REVERSE_VOUCHERS_${reverseVoucherIds[0].type.toUpperCase()}`
          )}
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
    <div className="overflow-y-auto pb-32px tablet:px-40px tablet:pt-10px">
      <div>帳本：{connectedAccountBook?.id}</div>

      {/* Info: (20250526 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('journal:VOUCHER_DETAIL_PAGE.TITLE')} {voucherNo ?? voucherId}
        </p>
      </div>

      <div className="flex justify-end gap-lv-5 py-lv-6 tablet:gap-lv-4 tablet:p-4">
        <Button id="download-voucher-btn" type="button" variant="tertiary" size={'defaultSquare'}>
          <MdOutlineFileDownload size={20} />
        </Button>
        <Button
          id="delete-voucher-btn"
          type="button"
          variant="tertiary"
          size={'defaultSquare'}
          className="disabled:cursor-not-allowed"
          onClick={isReverseRelated ? () => {} : deleteClickHandler}
          disabled={isReverseRelated} // Info: (20250120 - Julian) 被刪除或反轉的傳票不能再次刪除
        >
          <FiTrash2 size={20} />
        </Button>

        <Button
          id="edit-voucher-btn"
          type="button"
          variant="tertiary"
          size={'defaultSquare'}
          // Info: (20250120 - Julian) 被刪除或反轉的傳票不能編輯
          // ToDo: (20250122 - Julian) 先不開放手動開帳的編輯功能
          disabled={isReverseRelated || type === EventType.OPENING}
          className="disabled:cursor-not-allowed"
          onClick={() => {
            if (!(isReverseRelated || type === EventType.OPENING)) {
              if (certificates.length > 0 || (certificates.length === 0 && invoices.length === 0)) {
                router.push(`/users/accounting/${voucherId}/editing?voucherNo=${voucherNo}`);
              } else if (certificates.length === 0 && invoices.length > 0) {
                router.push(`/users/accounting/${voucherId}/editing_rc2?voucherNo=${voucherNo}`);
              }
            }
          }}
        >
          <FiEdit size={20} />
        </Button>
      </div>
      {/* Info: (20240926 - tzuhan) CertificateSelection */}
      {(certificates.length > 0 || (certificates.length === 0 && invoices.length === 0)) && (
        <CertificateSelection
          selectedCertificates={certificates}
          isSelectable={false}
          isDeletable={false}
        />
      )}
      {certificates.length === 0 && invoices.length > 0 && (
        <InvoiceSelection selectedInvoices={invoices} isSelectable={false} isDeletable={false} />
      )}
      {/* Info: (20241008 - Julian) Voucher Detail */}
      <div className="mt-lv-6 flex flex-col items-stretch gap-24px text-xs font-semibold tablet:mt-40px tablet:text-sm">
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
        {/* Info: (20241007 - Julian) Counterparty「非應收應付款」的 counterparty 不用顯示 */}
        {isARandAP && (
          <div className="flex justify-between">
            <p className="text-text-neutral-tertiary">
              {t('journal:VOUCHER_DETAIL_PAGE.COUNTERPARTY')}
            </p>
            {isDisplayCounterParty}
          </div>
        )}
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

      <div className="mt-lv-6 w-full overflow-x-auto tablet:mt-40px">
        {/* Info: (20241008 - Julian) Voucher Line Block */}
        <div className="flex w-max flex-col gap-8px rounded-md bg-surface-brand-secondary-soft px-24px py-12px text-xs tablet:w-auto tablet:text-base">
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
            <div className="col-start-3">{DecimalOperations.format(totalDebit)}</div>
            <div>{DecimalOperations.format(totalCredit)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherDetailPageBody;
