import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IJournal } from '@/interfaces/journal';
import CalendarIcon from '../calendar_icon/calendar_icon';

interface IJournalItemProps {
  key: string;
  journal: IJournal;
}

const JournalItem = ({ key, journal }: IJournalItemProps) => {
  // TODO: use journal data to display @Julian (20240510 - tzuhan)
  // Info: journal data from api, log is for Julian to check the data structure, should be removed later (20240510 - tzuahan)
  // eslint-disable-next-line no-console
  console.log(journal);
  const createdTimestamp = 1629148800;
  const type: string = 'Transfer';
  const particulars = 'Buy a pineapple';
  const fromOrTo = 'Family Mart';
  const debit = {
    account: '1141- Accounts receivable',
    amount: 1785000,
  };
  const credit = {
    account: '1113- Cash in banks',
    amount: 1785000,
  };
  const project = 'BAIFA';
  const projectCode = 'BF';
  const voucherNumber = '20240417-001';

  const displayedType =
    type === 'Payment' ? (
      <div className="flex w-fit items-center gap-5px rounded-full bg-errorRed2 px-10px py-6px text-sm font-medium text-errorRed">
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
      <div className="flex w-fit items-center gap-5px rounded-full bg-successGreen2 px-10px py-6px text-sm font-medium text-successGreen">
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
        <p>Transfer</p>
      </div>
    ) : null;

  const displayedAmount = (
    <div className="flex flex-col gap-8px py-8px text-left font-medium">
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-successGreen2 px-6px py-2px text-successGreen">
          <div className="h-6px w-6px rounded border-3px border-successGreen"></div>
          <p>Debit</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">{debit.account}</p>
        <p className="whitespace-nowrap text-navyBlue2">
          {debit.amount} <span className="text-lightGray4">TWD</span>
        </p>
      </div>
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-errorRed2 px-6px py-2px text-errorRed">
          <div className="h-6px w-6px rounded border-3px border-errorRed"></div>
          <p>Credit</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">{credit.account}</p>
        <p className="whitespace-nowrap text-navyBlue2">
          {credit.amount} <span className="text-lightGray4">TWD</span>
        </p>
      </div>
    </div>
  );

  return (
    <tr
      key={key}
      className="relative border-b border-lightGray6 text-center align-middle text-lightGray4"
    >
      {/* Info: (20240418 - Julian) 選取方塊 */}
      <td>
        <div className="flex justify-center px-10px">
          <input
            type="checkbox"
            className="relative h-4 w-4 border border-tertiaryBlue bg-white accent-tertiaryBlue"
          />
        </div>
      </td>
      {/* Info: (20240418 - Julian) 日期 */}
      <td className="border-x border-lightGray6">
        {/* Info: (20240418 - Julian) 將日期畫成日曆的 icon */}
        <CalendarIcon timestamp={createdTimestamp} />
      </td>
      {/* Info: (20240418 - Julian) 類型 */}
      <td className="px-16px">{displayedType}</td>
      {/* Info: (20240418 - Julian) 項目 */}
      <td className="px-16px text-left font-medium text-navyBlue2">{particulars}</td>
      {/* Info: (20240418 - Julian) From / To */}
      <td className="px-16px text-left font-medium text-navyBlue2">{fromOrTo}</td>
      {/* Info: (20240418 - Julian) 金額 */}
      <td className="px-16px">{displayedAmount}</td>
      {/* Info: (20240418 - Julian) 專案 */}
      <td className="px-16px text-left">
        <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
          <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
            {projectCode}
          </div>
          <p>{project}</p>
        </div>
      </td>
      {/* Info: (20240418 - Julian) 單據編號 */}
      <td className="px-16px text-right font-medium text-darkBlue">{voucherNumber}</td>

      {/* Info: (20240418 - Julian) Link */}
      <Link
        href={`${ISUNFA_ROUTE.ACCOUNTING}/${journal.id}`}
        className="absolute left-46px h-80px w-95%"
      ></Link>
    </tr>
  );
};

export default JournalItem;
