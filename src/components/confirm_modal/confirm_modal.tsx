import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { LuTag, LuAtom } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { VoucherRowType, useAccountingCtx } from '@/contexts/accounting_context';
import { checkboxStyle } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ILineItem } from '@/interfaces/line_item';
import AccountingVoucherRow from '@/components/accounting_voucher_row/accounting_voucher_row';
import AccountingVoucherRowMobile from '@/components/accounting_voucher_row/accounting_voucher_row_mobile';
import { Button } from '@/components/button/button';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IJournal } from '@/interfaces/journal';
import { ProgressStatus } from '@/constants/account';
import { IConfirmModal } from '@/interfaces/confirm_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { BUFFER_AMOUNT } from '@/constants/config';

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  confirmData: IConfirmModal;
}

const ConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
  confirmData,
}: IConfirmModalProps) => {
  const { t } = useTranslation(['common', 'journal']);
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const {
    AIStatus,
    getAIStatusHandler,
    totalCredit,
    totalDebit,
    accountList,
    generateAccountTitle,
    accountingVoucher,
    addVoucherRowHandler,
    changeVoucherAccountHandler,
    changeVoucherAmountHandler,
    resetVoucherHandler,
    selectedJournal,
    selectJournalHandler,
  } = useAccountingCtx();

  // // Info: (20240801 - Anna) 函數用來生成會計科目的標題，並進行多語系翻譯
  // const generateAccountTitleWithTranslation = (account: IAccount | null) => {
  //   if (account) {
  //     const title = generateAccountTitle(account);
  //     // 如果標題是 'Account Title'，則進行多語系翻譯
  //     return title === 'Account Title' ? t('journal:JOURNAL.ACCOUNT_TITLE') : title;
  //   }
  //   // 如果 account 是 null 或 undefined，返回預設值或其他處理方式
  //   return '';
  // };

  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();

  const { journalId, askAIId } = confirmData;

  const [eventType, setEventType] = useState<string>('');
  const [dateTimestamp, setDateTimestamp] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [project, setProject] = useState<string>('');
  const [contract, setContract] = useState<string>('');

  // Info: (20240527 - Julian) voucher verification
  const [isEveryRowHasAccount, setIsEveryRowHasAccount] = useState<boolean>(false);
  const [isNoEmptyRow, setIsNoEmptyRow] = useState<boolean>(false);
  const [isBalance, setIsBalance] = useState<boolean>(false);
  const [isTotalDebitBalanced, setIsTotalDebitBalanced] = useState<boolean>(false);
  const [isTotalCreditBalanced, setIsTotalCreditBalanced] = useState<boolean>(false);

  // Info: (20240730 - Julian)
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  const [journal, setJournal] = useState<IJournal | null>(null);

  // Info: (20240527 - Julian) Get AI 生成的傳票
  const {
    trigger: getAIResult,
    data: AIResult,
    success: AIResultSuccess,
    code: AIResultCode,
  } = APIHandler<{ lineItems: ILineItem[] }>(APIName.AI_ASK_RESULT);
  // Info: (20240527 - Julian) Get journal by id (上半部資料)
  const { trigger: getJournalById } = APIHandler<IJournal>(APIName.JOURNAL_GET_BY_ID);
  // Info: (20240527 - Julian) 建立傳票
  const { trigger: createVoucher } = APIHandler<IVoucherDataForAPIResponse | null>(
    APIName.VOUCHER_CREATE
  );
  const { trigger: updateVoucher } = APIHandler<IVoucherDataForAPIResponse | null>(
    APIName.VOUCHER_UPDATE
  );

  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  // Info: (20240430 - Julian) Get first letter of each word
  const projectCode = project.split(' ').reduce((acc, word) => acc + word[0], '');
  // Info: (20240711 - Julian) Check if AI result is successful
  const hasAIResult = AIResultSuccess && AIResult && AIResult.lineItems.length > 0;

  const addRowHandler = () => addVoucherRowHandler(1);
  const addDebitRowHandler = () => addVoucherRowHandler(1, VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(1, VoucherRowType.CREDIT);

  const importVoucherHandler = (initialLineItems?: ILineItem[]) => {
    try {
      // Info: (20240529 - Julian) 取得 AI 生成的傳票 or 日記帳的初始傳票
      const items = initialLineItems ?? AIResult?.lineItems ?? [];

      // Info: (20240529 - Julian) 清空 accountingVoucher
      resetVoucherHandler();

      // Info: (20240716 - Julian) 根據 AI 生成的傳票數量，新增 accountingVoucher
      addVoucherRowHandler(items.length - 1);

      // Info: (20240716 - Julian) 將 AI 生成的傳票逐一寫入 accountingVoucher
      items.forEach((lineItem, index) => {
        // Info: (20240716 - Julian) 在 accountList 中找到對應的 account
        const rowAccount = accountList.find((account) => account.id === lineItem.accountId);
        const rowAmount = lineItem.amount;
        // Info: (20240716 - Julian) 判斷 row type
        const rowType = lineItem.debit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT;
        const rowDescription = lineItem.description;

        // Info: (20240716 - Julian) 寫入 account
        changeVoucherAccountHandler(index, rowAccount);
        // Info: (20240716 - Julian) 寫入 description 和 amount
        changeVoucherAmountHandler(index, rowAmount, rowType, rowDescription);
      });
    } catch (err) {
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    }
  };

  const analysisBtnClickHandler = () => {
    // Info: (20240605 - Julian) Show warning message after clicking the button
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('journal:JOURNAL.REPLACE_INPUT'),
      subMsg: t('journal:JOURNAL.USE_AI'),
      content: t('journal:JOURNAL.TEXT_WILL_BE_REPLACED'),
      submitBtnStr: t('journal:JOURNAL.CONFIRM'),
      // Info: (20240716 - Julian) 從 API response 取出傳票列表
      submitBtnFunction: importVoucherHandler,
      backBtnStr: t('common:COMMON.CANCEL'),
      backBtnFunction: () => {
        getAIStatusHandler(undefined, false);
        messageModalVisibilityHandler();
      },
    });
    messageModalVisibilityHandler();
  };

  const closeHandler = () => {
    modalVisibilityHandler();
    getAIStatusHandler(undefined, false);
    resetVoucherHandler();
    setIsAILoading(true);
  };

  const convertToLineItems = () => {
    const newLineItems = accountingVoucher
      .filter((voucher) => voucher.account)
      .map((voucher) => {
        const isDebit = voucher.debit !== null;
        const debitAmount = voucher.debit ?? 0;
        const creditAmount = voucher.credit ?? 0;

        return {
          accountId: voucher.account!.id,
          lineItemIndex: `${voucher.id}`,
          account: generateAccountTitle(voucher.account),
          // Info: (20240801 - Anna) 使用 generateAccountTitleWithTranslation 函數生成會計科目的標題(翻譯後的)，取代原本的 generateAccountTitle 函數）
          // account: generateAccountTitleWithTranslation(voucher.account),
          description: voucher.particulars,
          debit: isDebit,
          amount: isDebit ? debitAmount : creditAmount,
        };
      });
    return newLineItems;
  };

  const handleAPIResponse = (res: {
    success: boolean;
    data: IVoucherDataForAPIResponse | null;
    code: string;
    error: Error | null;
  }) => {
    if (res.success && res.data && journal) {
      // Info: (20240503 - Julian) 關閉 Modal、清空 Voucher、清空 AI 狀態、清空 Journal
      closeHandler();
      selectJournalHandler(undefined);

      // Info: (20240527 - Julian) Toast notification
      toastHandler({
        id: `Voucher-${res.data.id}`,
        type: ToastType.SUCCESS,
        content: (
          <div className="flex items-center justify-between">
            <p>{t('journal:CONFIRM_MODAL.UPLOADED_SUCCESSFULLY')}</p>
            <Link
              href={ISUNFA_ROUTE.USERS_MY_REPORTS}
              className="font-semibold text-link-text-success hover:opacity-70"
            >
              {t('common:COMMON.GO_CHECK_IT')}
            </Link>
          </div>
        ),
        closeable: true,
      });

      // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
      window.location.href = `${ISUNFA_ROUTE.ACCOUNTING}/${res.data.journalId}`;
    }
    if (res.success === false) {
      messageModalDataHandler({
        title: t('journal:CONFIRM_MODAL.UPLOAD_FAILED'),
        subMsg: t('journal:JOURNAL.TRY_AGAIN_LATER'),
        content: t('common:COMMON.ERROR_CODE', { code: res.code }),
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };

  // Info: (20240527 - Julian) 送出 Voucher
  const confirmHandler = async () => {
    const newLineItems = convertToLineItems();

    if (hasCompanyId && journal && journal.invoice && newLineItems) {
      const voucher: IVoucherDataForSavingToDB = {
        journalId: journal.id,
        lineItems: newLineItems,
      };
      if (selectedJournal && journal?.voucher && Object.keys(journal.voucher).length > 0) {
        const updateRes = await updateVoucher({
          params: { companyId: selectedCompany.id },
          body: { voucher },
        });
        handleAPIResponse(updateRes);
      } else {
        const createRes = await createVoucher({
          params: { companyId: selectedCompany.id },
          body: { voucher },
        });
        handleAPIResponse(createRes);
      }
    }
  };

  const openHandler = async () => {
    if (!hasCompanyId || !journalId) return;
    const {
      success: getJournalSuccess,
      data,
      code: getJournalCode,
    } = await getJournalById({
      params: { companyId: selectedCompany.id, journalId },
    });
    if (data && getJournalSuccess) {
      setJournal(data);
      const { invoice, voucher } = data;
      if (invoice) {
        setDateTimestamp(invoice.date);
        setReason(invoice.paymentReason);
        setEventType(invoice.eventType);
        setCompanyName(invoice.vendorOrSupplier);
        setDescription(invoice.description);
        setTotalPrice(invoice.payment.price);
        setTaxPercentage(invoice.payment.taxPercentage);
        setFee(invoice.payment.fee);
        setPaymentMethod(invoice.payment.method);
        setPaymentPeriod(invoice.payment.period);
        setPaymentStatus(invoice.payment.status);
        setProject(invoice.project ?? 'None');
        setContract(invoice.contract ?? 'None');
      }
      if (voucher) {
        importVoucherHandler(voucher.lineItems);
      }
    }
    if (getJournalSuccess === false) {
      messageModalDataHandler({
        title: t('journal:JOURNAL.GET_JOURNAL_FAILED'),
        subMsg: t('journal:JOURNAL.TRY_AGAIN_LATER'),
        content: t('common:COMMON.ERROR_CODE', { code: getJournalCode }),
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (!isModalVisible || !hasCompanyId) return; // Info: (20240530 - Shirley) 在其他頁面沒用到 modal 時不調用 API
    openHandler();
    // Info: (20240529 - Julian) 清空 accountingVoucher
    resetVoucherHandler();
    // Info: (20240730 - Julian) 顯示 AI loading
    setIsAILoading(true);

    // Info: (20240528 - Julian) Call AI API first time
    getAIStatusHandler({ companyId: selectedCompany.id!, askAIId: askAIId! }, true);
  }, [isModalVisible]);

  // Info: (20240528 - Julian) Error handling
  useEffect(() => {
    if (hasCompanyId && AIStatus === ProgressStatus.SUCCESS) {
      getAIResult({
        params: {
          companyId: selectedCompany.id!,
          resultId: askAIId,
        },
      });
    }
    setIsAILoading(false);
    return () => getAIStatusHandler(undefined, false);
  }, [hasCompanyId, AIStatus]);

  useEffect(() => {
    const isCreditEqualDebit = totalCredit === totalDebit;
    const isNotEmpty = accountingVoucher.every((voucher) => !!voucher.debit || !!voucher.credit);
    const isEveryLineItemHasAccount = accountingVoucher.every((voucher) => !!voucher.account);

    // Info: (20240806 - Shirley) 計算借貸方科目加總
    const totalDebitAmount = accountingVoucher.reduce(
      (sum, voucher) => sum + (voucher.debit || 0),
      0
    );
    const totalCreditAmount = accountingVoucher.reduce(
      (sum, voucher) => sum + (voucher.credit || 0),
      0
    );

    // Info: (20240806 - Shirley) 檢查借方總額和貸方總額是否分別等於總金額
    const isDebitValid = Math.abs(totalDebitAmount - totalPrice) < BUFFER_AMOUNT; // Info: (20240806 - Shirley) 使用小於0.01來避免浮點數精度問題
    const isCreditValid = Math.abs(totalCreditAmount - totalPrice) < BUFFER_AMOUNT;

    setIsBalance(isCreditEqualDebit);
    setIsNoEmptyRow(isNotEmpty);
    setIsEveryRowHasAccount(isEveryLineItemHasAccount);
    setIsTotalDebitBalanced(isDebitValid);
    setIsTotalCreditBalanced(isCreditValid);
  }, [totalCredit, totalDebit, accountingVoucher, totalPrice]);

  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(會計事件類型)
  const typeString = eventType && typeof eventType === 'string' ? eventType : '';
  const translatedType = typeString
    ? t(`journal:JOURNAL_TYPES.${typeString.toUpperCase().replace(/ /g, '_')}`)
    : '';

  const displayDate = <p>{timestampToString(dateTimestamp).date}</p>;

  // ToDo: (20240729 - Julian) [Beta] Add Tag functionality
  const displayReason = (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>{reason}</p>
      <div className="hidden items-center gap-4px rounded-xs border border-badge-stroke-primary px-4px text-sm text-badge-text-primary">
        <LuTag size={14} />
        {t('journal:CONFIRM_MODAL.PRINTER')}
      </div>
    </div>
  );

  const displayVendor = <p className="font-semibold text-text-neutral-primary">{companyName}</p>;

  const displayDescription = (
    <p className="font-semibold text-text-neutral-primary">{description}</p>
  );

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-text-neutral-primary">{totalPrice}</span>{' '}
        {t('common:COMMON.TWD')}
      </p>
      <p>
        (<span className="font-semibold text-text-neutral-primary">{taxPercentage}%</span>{' '}
        {t('journal:JOURNAL.TAX')}
        <span className="font-semibold text-text-neutral-primary">{fee}</span>
        {t('journal:JOURNAL.TWD_FEE')})
      </p>
    </div>
  );

  const displayMethod = (
    <p className="text-right font-semibold text-text-neutral-primary">{t(paymentMethod)}</p>
  );
  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(付款期間)
  const paymentPeriodString = typeof paymentPeriod === 'string' ? paymentPeriod : '';
  const translatedPeriod = t(
    `journal:JOURNAL.${paymentPeriodString.toUpperCase().replace(/ /g, '_')}`
  );

  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(付款狀態)
  const paymentStatusString = typeof paymentStatus === 'string' ? paymentStatus : '';
  const translatedStatus = t(
    `journal:JOURNAL.${paymentStatusString.toUpperCase().replace(/ /g, '_')}`
  );

  const displayProject =
    project !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-badge-surface-soft-primary px-8px py-2px font-medium text-badge-text-primary-solid">
        <div className="flex h-14px w-14px items-center justify-center rounded-full bg-surface-support-strong-indigo text-xxs text-avatar-text-in-dark-background">
          {projectCode}
        </div>
        <p>{project}</p>
      </div>
    ) : (
      <p className="font-semibold text-text-neutral-primary">{t('journal:JOURNAL.NONE')}</p>
    );

  // Info: (20240731 - Anna) 把合約None加上多語系
  const displayContract =
    contract !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-badge-surface-soft-primary px-8px py-2px font-medium text-badge-text-primary-solid">
        <p className="font-semibold text-link-text-primary">{contract}</p>
      </div>
    ) : (
      <p className="font-semibold text-text-neutral-primary">{t('journal:JOURNAL.NONE')}</p>
    );

  const displayedHint = hasAIResult ? (
    // Info: (20240829 - Julian) AI 解析成功
    <p className="text-badge-text-success-solid">
      {t('journal:CONFIRM_MODAL.AI_ANALYSIS_COMPLETE')}
    </p>
  ) : (AIStatus === ProgressStatus.IN_PROGRESS || AIStatus === ProgressStatus.SUCCESS) &&
    isAILoading ? (
    // Info: (20240829 - Julian) AI 載入中
    <p className="text-slider-surface-bar">
      {t('journal:CONFIRM_MODAL.AI_TECHNOLOGY_PROCESSING')}
      <span className="mx-2px inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar delay-300"></span>
      <span className="mr-2px inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar delay-150"></span>
      <span className="inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar"></span>
    </p>
  ) : !AIResultSuccess && AIResultCode ? (
    // Info: (20240829 - Julian) AI 解析失敗
    <p className="text-text-neutral-secondary">
      {t('journal:CONFIRM_MODAL.AI_DETECTION_ERROR_ERROR_CODE')} {AIResultCode}
    </p>
  ) : (
    // Info: (20240829 - Julian) AI 無解析結果
    <p className="text-slider-surface-bar">
      {t('journal:CONFIRM_MODAL.THERE_ARE_NO_RECOMMENDATIONS_FROM_AI')}
    </p>
  );

  const accountingVoucherRow = accountingVoucher.map((voucher) => (
    <AccountingVoucherRow key={voucher.id} accountingVoucher={voucher} />
  ));

  const debitListMobile = accountingVoucher
    .filter((voucher) => !!voucher.debit) // Info: (20240530 - Julian) 找出 Debit 的 Voucher
    .map((debit) => <AccountingVoucherRowMobile type="Debit" accountingVoucher={debit} />);

  const creditListMobile = accountingVoucher
    .filter((voucher) => !!voucher.credit) // Info: (20240530 - Julian) 找出 Credit 的 Voucher
    .map((credit) => <AccountingVoucherRowMobile type="Credit" accountingVoucher={credit} />);

  const displayAccountingVoucherMobile = (
    <div className="flex w-full flex-col gap-24px py-10px text-sm md:hidden">
      {/* Info: (20240510 - Julian) Debit */}
      <div className="flex flex-col gap-24px">
        {/* Info: (20240510 - Julian) Divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-divider-stroke-lv-1" />
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Debit</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-1" />
        </div>
        {/* Info: (20240510 - Julian) List */}
        <div className="flex flex-col">{debitListMobile}</div>

        {/* Info: (20240510 - Julian) Add Button */}
        <Button
          id="add-debit-btn-mobile"
          type="button"
          onClick={addDebitRowHandler}
          variant="tertiaryOutline"
          className="mx-auto mt-24px h-44px w-44px p-0"
        >
          <FiPlus size={20} />
        </Button>
      </div>

      {/* Info: (20240510 - Julian) Credit */}
      <div className="flex flex-col gap-24px">
        {/* Info: (20240510 - Julian) Divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-divider-stroke-lv-1" />
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Credit</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-1" />
        </div>
        {/* Info: (20240510 - Julian) List */}
        <div className="flex flex-col">{creditListMobile}</div>

        {/* Info: (20240510 - Julian) Add Button */}
        <Button
          id="add-credit-btn-mobile"
          type="button"
          onClick={addCreditRowHandler}
          className="mx-auto mt-24px h-44px w-44px p-0"
          variant="tertiaryOutline"
        >
          <FiPlus size={20} />
        </Button>
      </div>
    </div>
  );

  const displayAccountingVoucher = (
    <div className="hidden w-full flex-col gap-24px text-base md:flex">
      {/* Info: (20240429 - Julian) Divider */}
      <div className="flex items-center gap-4">
        <hr className="flex-1 border-divider-stroke-lv-1" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
          <p>{t('journal:JOURNAL.ACCOUNTING_VOUCHER')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-1" />
      </div>
      {/* Info: (20240429 - Julian) List */}
      <div className="rounded-sm bg-surface-neutral-main-background p-20px">
        <table className="w-full text-left text-input-text-primary">
          {/* Info: (20240429 - Julian) Header */}
          <thead>
            <tr>
              <th>{t('journal:JOURNAL.ACCOUNTING')}</th>
              <th>{t('journal:JOURNAL.PARTICULARS')}</th>
              <th>{t('journal:JOURNAL.DEBIT')}</th>
              <th>{t('journal:JOURNAL.CREDIT')}</th>
            </tr>
          </thead>
          {/* Info: (20240429 - Julian) Body */}
          <tbody>{accountingVoucherRow}</tbody>
        </table>
      </div>
    </div>
  );

  const displayVerifyAcc = (
    <div className="flex items-center gap-12px">
      {isEveryRowHasAccount ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isEveryRowHasAccount ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Info: (20240731 - Anna) Each row includes an accounting account. */}
        {t('journal:JOURNAL.EACH_ROW_INCLUDES_AN_ACCOUNTING_ACCOUNT')}
      </p>
    </div>
  );

  const displayVerifyNoEmpty = (
    <div className="flex items-center gap-12px">
      {isNoEmptyRow ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isNoEmptyRow ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Info: (20240731 - Anna) Each row includes a debit or credit. */}
        {t('journal:JOURNAL.EACH_ROW_INCLUDES_A_DEBIT_OR_CREDIT')}
      </p>
    </div>
  );

  const displayVerifyBalance = (
    <div className="flex items-center gap-12px">
      {isBalance ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isBalance ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Info: (20240731 - Anna) Debits and credits balance out. */}
        {t('journal:JOURNAL.DEBITS_AND_CREDITS_BALANCE_OUT')}
      </p>
    </div>
  );

  const displayVerifyDebitAmount = (
    <div className="flex items-center gap-12px">
      {isTotalDebitBalanced ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isTotalDebitBalanced ? 'text-text-state-success' : 'text-text-state-error'}>
        {t('journal:JOURNAL.DEBIT_AMOUNT_BALANCED')}
      </p>
    </div>
  );

  const displayVerifyCreditAmount = (
    <div className="flex items-center gap-12px">
      {isTotalCreditBalanced ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isTotalCreditBalanced ? 'text-text-state-success' : 'text-text-state-error'}>
        {t('journal:JOURNAL.CREDIT_AMOUNT_BALANCED')}
      </p>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-500px w-90vw flex-col rounded-sm bg-card-surface-primary py-16px md:max-h-90vh">
        {/* Info: (20240429 - Julian) title */}
        <div className="flex items-center gap-6px px-20px font-bold text-card-text-primary">
          <Image src="/icons/files.svg" width={20} height={20} alt="files_icon" />
          {/* Info: (20240429 - Julian) desktop title */}
          <h1 className="hidden whitespace-nowrap text-xl md:block">
            {t('journal:CONFIRM_MODAL.PLEASE_MAKE_SURE')}
          </h1>
          {/* Info: (20240429 - Julian) mobile title */}
          <h1 className="block text-xl md:hidden">{t('journal:JOURNAL.CONFIRM')}</h1>
        </div>
        {/* Info: (20240429 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-20px top-20px text-icon-surface-single-color-primary"
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20240527 - Julian) Body */}
        <div className="mt-10px flex flex-col overflow-y-auto overflow-x-hidden bg-surface-neutral-main-background px-20px pb-20px md:bg-transparent">
          {/* Info: (20240429 - Julian) content */}
          <div className="mt-20px flex w-full flex-col gap-12px text-sm text-text-neutral-secondary md:text-base">
            {/* Info: (20240429 - Julian) Type */}
            <div className="flex items-center justify-between">
              <p>{t('common:COMMON.TYPE')}</p>
              {/* Info: (20240731 - Anna) 把displayType(會計事件類型)替換成翻譯過的 */}
              <p className="text-surface-state-error">{translatedType}</p>
            </div>
            {/* Info: (20240507 - Julian) Date */}
            <div className="flex items-center justify-between">
              <p>{t('common:DATE_PICKER.DATE')}</p>
              {displayDate}
            </div>
            {/* Info: (20240429 - Julian) Reason */}
            <div className="flex items-center justify-between">
              <p>{t('journal:JOURNAL.REASON')}</p>
              {displayReason}
            </div>
            {/* Info: (20240429 - Julian) Vendor/Supplier */}
            <div className="flex items-center justify-between">
              <p>{t('journal:JOURNAL.VENDOR_SUPPLIER')}</p>
              {displayVendor}
            </div>
            {/* Info: (20240429 - Julian) Description */}
            <div className="flex items-center justify-between">
              <p>{t('journal:JOURNAL.DESCRIPTION')}</p>
              {displayDescription}
            </div>
            {/* Info: (20240429 - Julian) Total Price */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('journal:JOURNAL.TOTAL_PRICE')}</p>
              {displayTotalPrice}
            </div>
            {/* Info: (20240429 - Julian) Payment Method */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('journal:JOURNAL.PAYMENT_METHOD')}</p>
              {displayMethod}
            </div>
            {/* Info: (20240429 - Julian) Payment Period */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('journal:JOURNAL.PAYMENT_PERIOD')}</p>
              {/* Info: (20240731 - Anna) 把displayPeriod(付款期間)替換成翻譯過的 */}
              {translatedPeriod && (
                <p className="font-semibold text-text-neutral-primary">{translatedPeriod}</p>
              )}
            </div>
            {/* Info: (20240429 - Julian) Payment Status */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('journal:JOURNAL.PAYMENT_STATUS')}</p>
              {/* Info: (20240731 - Anna) 把displayType(付款狀態)替換成翻譯過的 */}
              {translatedStatus && (
                <p className="font-semibold text-text-neutral-primary">{translatedStatus}</p>
              )}
              {/* Info: (20240731 - Anna) {displayStatus} */}
            </div>
            {/* Info: (20240429 - Julian) Project */}
            <div className="flex items-center justify-between">
              <p>{t('common:COMMON.PROJECT')}</p>
              {displayProject}
            </div>
            {/* Info: (20240429 - Julian) Contract */}
            <div className="flex items-center justify-between">
              <p>{t('journal:JOURNAL.CONTRACT')}</p>
              {displayContract}
            </div>
          </div>

          {/* Info: (20240429 - Julian) Accounting Voucher */}
          {displayAccountingVoucher}
          {displayAccountingVoucherMobile}

          <div className="relative mt-24px">
            {/* Info: (20240605 - Julian) AI analysis result */}
            <div className="mt-40px flex flex-col items-center md:mt-0 md:flex-row md:gap-x-16px">
              {/* Info: (20240605 - Julian) button */}
              <button
                id="ai-analysis-btn"
                type="button"
                disabled={!hasAIResult}
                onClick={analysisBtnClickHandler}
                className="flex h-44px w-44px items-center justify-center rounded-xs bg-button-surface-strong-secondary text-button-text-invert hover:cursor-pointer hover:opacity-70 disabled:bg-button-surface-strong-disable disabled:text-button-text-disable hover:disabled:cursor-default hover:disabled:opacity-100"
              >
                <LuAtom size={20} />
              </button>
              {displayedHint}
            </div>

            {/* Info: (20240430 - Julian) Add Button */}
            <div className="flex justify-center">
              <Button
                id="add-row-btn"
                type="button"
                onClick={addRowHandler}
                variant="tertiaryOutline"
                className="mt-24px h-44px w-44px p-0"
              >
                <FiPlus size={20} />
              </Button>
            </div>
          </div>

          {/* Info: (20240429 - Julian) checkbox */}
          <div className="my-24px flex flex-wrap justify-between gap-y-4px">
            <p className="text-sm font-semibold text-text-neutral-primary">
              {/* Info: (tzuhan - 20230513) eslint recommendation `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.eslint  */}
              {t('journal:CONFIRM_MODAL.ATTENTION')}
            </p>
            <label
              htmlFor="addToBook"
              className="ml-auto flex items-center gap-8px text-sm text-checkbox-text-primary"
            >
              <input id="addToBook" className={checkboxStyle} type="checkbox" checked />
              <p>{t('journal:CONFIRM_MODAL.ADD_ACCOUNTING_VOUCHER')}</p>
            </label>
          </div>

          {/* Info: (20240730 - Julian) Verify Hints */}
          <div className="mx-20px flex flex-col items-center justify-center gap-20px rounded-sm bg-surface-support-soft-maple px-20px py-10px text-sm font-semibold md:flex-row md:py-5px">
            {/* Info: (20240730 - Julian) Verify all rows have account */}
            {displayVerifyAcc}
            {/* Info: (20240730 - Julian) Verify no empty row */}
            {displayVerifyNoEmpty}
            {/* Info: (20240730 - Julian) Verify balancing debits and credits */}
            {displayVerifyBalance}
            {/* Info: (20240806 - Shirley) Verify debit and credit amount */}
            {displayVerifyDebitAmount}
            {displayVerifyCreditAmount}
          </div>
        </div>

        {/* Info: (20240429 - Julian) Buttons */}
        <div className="mx-20px mt-24px flex items-center justify-end gap-12px">
          <Button id="cancel-btn" type="button" onClick={closeHandler} variant="tertiaryBorderless">
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="confirm-btn"
            type="button"
            variant="tertiary"
            disabled={
              !(
                isBalance &&
                isNoEmptyRow &&
                isEveryRowHasAccount &&
                isTotalDebitBalanced &&
                isTotalCreditBalanced
              )
            }
            onClick={confirmHandler}
          >
            {t('journal:JOURNAL.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ConfirmModal;
