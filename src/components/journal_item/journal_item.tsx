import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IJournal, IJournalListItem } from '@/interfaces/journal';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { truncateString, numberWithCommas } from '@/lib/utils/common';
import { EventType } from '@/constants/account';
// Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
// import { checkboxStyle } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { JOURNAL_EVENT } from '@/constants/journal';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useRouter } from 'next/router';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';

interface IJournalItemProps {
  event: JOURNAL_EVENT;
  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // isChecked: boolean;
  // checkHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  companyId: number;
  // ToDo: (20240528 - Julian) [Beta] 這裡的 interface 需要再確認
  journal: IJournalListItem;
  onDelete: (companyId: number, journalId: number) => Promise<void>;
}

const Operations = ({
  companyId,
  journalId,
  onDelete,
}: {
  companyId: number;
  journalId: number;
  onDelete: (companyId: number, journalId: number) => Promise<void>;
}) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { selectJournalHandler } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const { trigger: getJournalById } = APIHandler<IJournal>(APIName.JOURNAL_GET_BY_ID);

  const editJournalHandler = async () => {
    const {
      success,
      code,
      data: journal,
    } = await getJournalById({
      params: { companyId, journalId },
    });
    if (success && journal) {
      selectJournalHandler(journal);
      router.push(ISUNFA_ROUTE.ACCOUNTING);
    } else {
      messageModalDataHandler({
        title: t('JOURNAL.FAILED_TO_FETCH_DATA'),
        subMsg: t('JOURNAL.TRY_AGAIN_LATER'),
        content: `Error code: ${code}`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };

  return (
    <td className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-4px md:justify-end">
      <button
        type="button"
        className="rounded-xs p-5px text-secondaryBlue hover:text-primaryYellow md:p-10px"
        onClick={editJournalHandler}
      >
        <svg
          width="20"
          height="20"
          viewBox="10 10 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M24.8886 11.5538C25.8719 10.5706 27.466 10.5706 28.4493 11.5538C29.4325 12.5371 29.4325 14.1313 28.4493 15.1145L20.4803 23.0835C20.4646 23.0992 20.449 23.1148 20.4335 23.1303C20.1914 23.3728 19.9871 23.5774 19.7413 23.7281C19.5251 23.8606 19.2893 23.9582 19.0427 24.0174C18.7624 24.0847 18.4732 24.0845 18.1306 24.0842C18.1087 24.0842 18.0867 24.0842 18.0644 24.0842H16.6689C16.2547 24.0842 15.9189 23.7484 15.9189 23.3342V21.9387C15.9189 21.9165 15.9189 21.8944 15.9189 21.8726C15.9186 21.5299 15.9184 21.2407 15.9857 20.9604C16.0449 20.7138 16.1425 20.478 16.275 20.2618C16.4257 20.016 16.6303 19.8117 16.8728 19.5696C16.8883 19.5541 16.9039 19.5386 16.9196 19.5228L24.8886 11.5538ZM27.3886 12.6145C26.9912 12.217 26.3467 12.217 25.9493 12.6145L17.9803 20.5835C17.6668 20.897 17.5999 20.9707 17.554 21.0456C17.5037 21.1276 17.4667 21.217 17.4443 21.3105C17.4237 21.396 17.4189 21.4954 17.4189 21.9387V22.5842H18.0644C18.5077 22.5842 18.6072 22.5794 18.6926 22.5588C18.7861 22.5364 18.8755 22.4994 18.9575 22.4491C19.0324 22.4032 19.1062 22.3363 19.4197 22.0228L27.3886 14.0538C27.7861 13.6564 27.7861 13.012 27.3886 12.6145ZM15.6375 12.5842L15.6689 12.5842H19.1689C19.5832 12.5842 19.9189 12.92 19.9189 13.3342C19.9189 13.7484 19.5832 14.0842 19.1689 14.0842H15.6689C14.9565 14.0842 14.4673 14.0848 14.088 14.1157C13.7175 14.146 13.5185 14.2015 13.3745 14.2749C13.0452 14.4427 12.7775 14.7104 12.6097 15.0397C12.5363 15.1837 12.4808 15.3828 12.4505 15.7533C12.4195 16.1325 12.4189 16.6217 12.4189 17.3342V24.3342C12.4189 25.0466 12.4195 25.5358 12.4505 25.9151C12.4808 26.2856 12.5363 26.4846 12.6097 26.6287C12.7775 26.9579 13.0452 27.2257 13.3745 27.3934C13.5185 27.4668 13.7175 27.5223 14.088 27.5526C14.4673 27.5836 14.9565 27.5842 15.6689 27.5842H22.6689C23.3814 27.5842 23.8706 27.5836 24.2499 27.5526C24.6204 27.5223 24.8194 27.4668 24.9634 27.3934C25.2927 27.2257 25.5604 26.9579 25.7282 26.6287C25.8016 26.4846 25.8571 26.2856 25.8874 25.9151C25.9184 25.5358 25.9189 25.0466 25.9189 24.3342V20.8342C25.9189 20.42 26.2547 20.0842 26.6689 20.0842C27.0832 20.0842 27.4189 20.42 27.4189 20.8342V24.3342V24.3656C27.419 25.039 27.419 25.5897 27.3824 26.0372C27.3445 26.5005 27.2638 26.9189 27.0647 27.3096C26.7531 27.9212 26.2559 28.4184 25.6444 28.7299C25.2537 28.929 24.8353 29.0098 24.372 29.0476C23.9245 29.0842 23.3738 29.0842 22.7004 29.0842H22.6689H15.6689H15.6375C14.9641 29.0842 14.4134 29.0842 13.9659 29.0476C13.5026 29.0098 13.0842 28.929 12.6935 28.7299C12.082 28.4184 11.5848 27.9212 11.2732 27.3096C11.0741 26.9189 10.9933 26.5005 10.9555 26.0372C10.9189 25.5897 10.9189 25.039 10.9189 24.3656L10.9189 24.3342V17.3342L10.9189 17.3028C10.9189 16.6294 10.9189 16.0787 10.9555 15.6311C10.9933 15.1678 11.0741 14.7494 11.2732 14.3587C11.5848 13.7472 12.0819 13.25 12.6935 12.9384C13.0842 12.7393 13.5026 12.6586 13.9659 12.6207C14.4134 12.5842 14.9642 12.5842 15.6375 12.5842Z"
              fill="#001840"
            />
          </g>
        </svg>
      </button>
      <button
        type="button"
        className="rounded-xs p-5px text-secondaryBlue hover:text-primaryYellow md:p-10px"
        onClick={() => onDelete(companyId, journalId)}
      >
        <svg
          width="20"
          height="20"
          viewBox="10 10 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.3068 10.918L19.3363 10.918H20.6696L20.6991 10.918C21.1407 10.918 21.5166 10.9179 21.8253 10.9432C22.1496 10.9697 22.4651 11.0277 22.7667 11.1814C23.2215 11.4131 23.5912 11.7828 23.8229 12.2375C23.9765 12.5391 24.0346 12.8546 24.0611 13.1789C24.0853 13.475 24.0862 13.8329 24.0863 14.2513H25.8363H27.5029C27.9171 14.2513 28.2529 14.5871 28.2529 15.0013C28.2529 15.4155 27.9171 15.7513 27.5029 15.7513H26.5863V24.3346V24.3661C26.5863 25.0394 26.5863 25.5901 26.5497 26.0377C26.5119 26.501 26.4311 26.9194 26.232 27.3101C25.9204 27.9216 25.4233 28.4188 24.8117 28.7304C24.421 28.9295 24.0026 29.0102 23.5393 29.0481C23.0918 29.0847 22.5411 29.0846 21.8677 29.0846H21.8363H18.1696H18.1382C17.4648 29.0846 16.9141 29.0847 16.4665 29.0481C16.0033 29.0102 15.5849 28.9295 15.1941 28.7304C14.5826 28.4188 14.0854 27.9216 13.7738 27.3101C13.5747 26.9194 13.494 26.501 13.4561 26.0377C13.4196 25.5901 13.4196 25.0394 13.4196 24.3661L13.4196 24.3346V15.7513H12.5029C12.0887 15.7513 11.7529 15.4155 11.7529 15.0013C11.7529 14.5871 12.0887 14.2513 12.5029 14.2513H14.1696H15.9196C15.9196 13.8329 15.9206 13.475 15.9448 13.1789C15.9713 12.8546 16.0293 12.5391 16.183 12.2375C16.4147 11.7828 16.7844 11.4131 17.2391 11.1814C17.5407 11.0277 17.8562 10.9697 18.1805 10.9432C18.4892 10.9179 18.8652 10.918 19.3068 10.918ZM16.6696 15.7513H14.9196V24.3346C14.9196 25.0471 14.9202 25.5363 14.9512 25.9156C14.9814 26.2861 15.0369 26.4851 15.1103 26.6291C15.2781 26.9584 15.5458 27.2261 15.8751 27.3939L15.5346 28.0622L15.8751 27.3939C16.0192 27.4673 16.2182 27.5228 16.5887 27.5531C16.9679 27.5841 17.4572 27.5846 18.1696 27.5846H21.8363C22.5487 27.5846 23.0379 27.5841 23.4172 27.5531C23.7877 27.5228 23.9867 27.4673 24.1307 27.3939C24.46 27.2261 24.7277 26.9584 24.8955 26.6291C24.9689 26.4851 25.0244 26.2861 25.0547 25.9156C25.0857 25.5363 25.0863 25.0471 25.0863 24.3346V15.7513H23.3363H16.6696ZM22.5863 14.2513H17.4196C17.4197 13.8186 17.4213 13.5271 17.4398 13.301C17.4587 13.0695 17.4915 12.9734 17.5195 12.9185C17.6074 12.746 17.7476 12.6058 17.9201 12.5179C17.975 12.4899 18.0711 12.4571 18.3027 12.4382C18.543 12.4186 18.8572 12.418 19.3363 12.418H20.6696C21.1487 12.418 21.4629 12.4186 21.7032 12.4382C21.9347 12.4571 22.0308 12.4899 22.0858 12.5179C22.2582 12.6058 22.3985 12.746 22.4864 12.9185C22.5143 12.9734 22.5471 13.0695 22.566 13.301C22.5845 13.5271 22.5861 13.8186 22.5863 14.2513ZM18.3363 18.8346C18.7505 18.8346 19.0863 19.1704 19.0863 19.5846V23.7513C19.0863 24.1655 18.7505 24.5013 18.3363 24.5013C17.922 24.5013 17.5863 24.1655 17.5863 23.7513V19.5846C17.5863 19.1704 17.922 18.8346 18.3363 18.8346ZM21.6696 18.8346C22.0838 18.8346 22.4196 19.1704 22.4196 19.5846V23.7513C22.4196 24.1655 22.0838 24.5013 21.6696 24.5013C21.2554 24.5013 20.9196 24.1655 20.9196 23.7513V19.5846C20.9196 19.1704 21.2554 18.8346 21.6696 18.8346Z"
              fill="#001840"
            />
          </g>
        </svg>
      </button>
    </td>
  );
};

const JournalItem = ({
  event,
  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // isChecked,
  // checkHandler,
  companyId,
  journal,
  onDelete,
}: IJournalItemProps) => {
  const { t } = useTranslation('common');
  const {
    id: journalId,
    date: createdTimestamp,
    type: eventType,
    particulars: description,
    // Info: (20240808 - Anna) Alpha版先隱藏(會計事件配對專案名稱)
    // projectName,
    account: lineItems,
    voucherId,
    voucherNo,
    fromTo,
  } = journal;

  const defaultItem = {
    account: '',
    amount: 0,
  };

  const debitItem = lineItems
    ? (lineItems.filter((item) => item.debit)[0] ?? defaultItem)
    : defaultItem;
  const debit = {
    account: debitItem.account,
    amount: numberWithCommas(debitItem.amount),
  };

  const creditItem = lineItems
    ? (lineItems.filter((item) => !item.debit)[0] ?? defaultItem)
    : defaultItem;
  const credit = {
    account: creditItem.account,
    amount: numberWithCommas(creditItem.amount),
  };

  const displayedType =
    // Info: (20240517 - Julian) 費用
    eventType === EventType.PAYMENT ? (
      <div className="flex w-fit items-center gap-5px rounded-full bg-badge-surface-soft-error px-10px py-6px text-sm font-medium text-badge-text-error-solid">
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
        <p className="whitespace-nowrap">{t('JOURNAL.PAYMENT')}</p>
      </div>
    ) : // Info: (20240517 - Julian) 收入
    eventType === EventType.INCOME ? (
      <div className="flex w-fit items-center gap-5px rounded-full bg-badge-surface-soft-success px-10px py-6px text-sm font-medium text-badge-text-success-solid">
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
        <p className="whitespace-nowrap">{t('JOURNAL.RECEIVING')}</p>
      </div>
    ) : // Info: (20240517 - Julian) 轉帳
    eventType === EventType.TRANSFER ? (
      <div className="flex w-fit items-center gap-5px rounded-full bg-lightGray3 px-10px py-6px text-sm font-medium text-navyBlue">
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
        <p className="whitespace-nowrap">{t('JOURNAL.TRANSFER')}</p>
      </div>
    ) : null;

  const displayedAmount = (
    <div className="flex flex-col gap-8px py-8px text-left font-medium">
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-badge-surface-soft-success px-6px py-2px text-badge-text-success-solid">
          <div className="h-6px w-6px rounded border-3px border-badge-text-success-solid"></div>
          <p>{t('JOURNAL.DEBIT')}</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">
          {truncateString(debit.account, 10)}
        </p>
        <p className="whitespace-nowrap text-navyBlue2">
          {debit.amount} <span className="text-lightGray4">{t('JOURNAL.TWD')}</span>
        </p>
      </div>
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-badge-surface-soft-error px-6px py-2px text-badge-text-error-solid">
          <div className="h-6px w-6px rounded border-3px border-badge-text-error-solid"></div>
          <p>{t('JOURNAL.CREDIT')}</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">
          {truncateString(credit.account, 10)}
        </p>
        <p className="whitespace-nowrap text-navyBlue2">
          {credit.amount} <span className="text-lightGray4">{t('JOURNAL.TWD')}</span>
        </p>
      </div>
    </div>
  );

  return (
    <tr
      key={voucherId}
      className="relative border-b border-lightGray6 text-center align-middle text-lightGray4"
    >
      {/* Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊) */}
      {/* Info: (20240418 - Julian) 選取方塊 */}
      {/* <td>
        <div className="flex justify-center md:px-10px">
          <input
            id={voucherNo}
            type="checkbox"
            checked={isChecked}
            onChange={checkHandler}
            className={checkboxStyle}
          />
        </div>
      </td> */}
      {/* Info: (20240418 - Julian) 日期 */}
      <td className="border-x border-lightGray6">
        {/* Info: (20240418 - Julian) 將日期畫成日曆的 icon */}
        <CalendarIcon timestamp={createdTimestamp} />
      </td>
      {/* Info: (20240418 - Julian) 類型 */}
      <td className="collapse px-16px md:visible">{displayedType}</td>
      {/* Info: (20240418 - Julian) 描述 */}
      <td className="px-16px text-left font-medium text-navyBlue2">
        {truncateString(description ?? '', 10)}
      </td>
      {/* Info: (20240418 - Julian) From / To */}
      <td className="px-16px text-left font-medium text-navyBlue2">{fromTo}</td>
      {/* Info: (20240418 - Julian) 金額 */}
      <td className="px-16px">{displayedAmount}</td>
      {/* Info: (20240418 - Julian) 專案 */}
      <td className="px-16px text-left">
        {/* Info: (20240808 - Anna) Alpha版先隱藏(會計事件配對專案名稱) */}
        {/* <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
          ToDo: (20240517 - Julian) [Beta] Replace with project icon
          <div className="flex h-14px w-14px items-center justify-center rounded-full bg-surface-support-strong-indigo text-xxs text-white">
            BF
          </div>
          <p>{projectName}</p>
        </div> */}
      </td>
      {/* Info: (20240418 - Julian) 單據編號 */}
      {event === JOURNAL_EVENT.UPLOADED && (
        <td className="px-16px text-right font-medium text-link-text-primary">{voucherNo}</td>
      )}
      {event === JOURNAL_EVENT.UPCOMING && (
        <td className="px-16px text-right font-medium text-link-text-primary"></td>
      )}
      {/* Info: (20240418 - Julian) Link */}
      <Link
        href={`${ISUNFA_ROUTE.ACCOUNTING}/${journalId}`}
        className="absolute left-46px h-80px w-95%"
      ></Link>
      {event === JOURNAL_EVENT.UPCOMING && (
        <Operations companyId={companyId} journalId={journalId} onDelete={onDelete} />
      )}
    </tr>
  );
};

export const JournalItemMobile = ({
  event,
  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // isChecked,
  // checkHandler,
  companyId,
  journal,
  onDelete,
}: IJournalItemProps) => {
  const { t } = useTranslation('common');
  const { id, date, type: eventType, particulars: description, voucherNo } = journal;
  const price = 0; // ToDo: (20240528 - Julian) [Beta] Interface lacks price

  const createdTimestamp = date / 1000; // Info: (20240517 - Julian) 需轉換成十位數的 timestamp

  const displayedTypeMobile =
    // Info: (20240517 - Julian) 費用
    eventType === EventType.PAYMENT ? (
      <div className="flex w-fit items-center rounded-full bg-badge-surface-soft-error px-10px py-6px text-sm font-medium text-badge-text-error-solid">
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
      </div>
    ) : // Info: (20240517 - Julian) 收入
    eventType === EventType.INCOME ? (
      <div className="flex w-fit items-center rounded-full bg-badge-surface-soft-success px-10px py-6px text-sm font-medium text-badge-text-success-solid">
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
      </div>
    ) : // Info: (20240517 - Julian) 轉帳
    eventType === EventType.TRANSFER ? (
      <div className="flex w-fit items-center rounded-full bg-lightGray3 px-10px py-6px text-sm font-medium text-navyBlue">
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
      </div>
    ) : null;

  return (
    <tr key={id} className="relative border-b border-lightGray6 text-center text-lightGray4">
      {/* Info: (20240418 - Julian) 選取方塊 */}
      <td className="align-middle md:w-50px">
        <div className="flex justify-center px-10px">
          <input
            id={`${id}`}
            type="checkbox"
            // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
            // checked={isChecked}
            // onChange={checkHandler}
            className="relative h-4 w-4 border border-tertiaryBlue bg-white accent-tertiaryBlue"
          />
        </div>
      </td>
      {/* Info: (20240418 - Julian) 日期 */}
      <td className="border-x border-lightGray6 align-middle">
        {/* Info: (20240418 - Julian) 將日期畫成日曆的 icon */}
        <CalendarIcon timestamp={createdTimestamp} />
      </td>
      {/* Info: (20240418 - Julian) 重要資訊 */}
      <td className="align-middle">
        <div className="flex w-180px items-center justify-center gap-4px p-8px">
          {/* Info: (20240517 - Julian) 類型 */}
          {displayedTypeMobile}
          <div className="flex flex-1 flex-col text-xs text-navyBlue2">
            {/* Info: (20240517 - Julian) 描述 */}
            <p className="flex-1 whitespace-nowrap">{truncateString(description ?? '', 10)}</p>
            {/* Info: (20240517 - Julian) 金額 */}
            <p>
              {numberWithCommas(price)} <span className="text-lightGray4">{t('JOURNAL.TWD')}</span>
            </p>
          </div>
        </div>
      </td>
      <td>
        {event === JOURNAL_EVENT.UPLOADED && <div>{voucherNo}</div>}
        {event === JOURNAL_EVENT.UPCOMING && (
          <Operations companyId={companyId} journalId={id} onDelete={onDelete} />
        )}
      </td>
    </tr>
  );
};

export default JournalItem;
