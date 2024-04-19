import CalendarIcon from '../calendar_icon/calendar_icon';

const JournalList = () => {
  const displayedType = (
    <div className="flex w-fit items-center gap-5px rounded-full bg-errorRed2 px-10px py-6px font-medium text-errorRed">
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
  );

  const displayedAmount = (
    <div className="flex flex-col gap-8px py-8px text-left font-medium">
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-successGreen2 px-6px py-2px text-successGreen">
          <div className="h-6px w-6px rounded border-3px border-successGreen"></div>
          <p>Debit</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">1141- Accounts receivable</p>
        <p className="whitespace-nowrap text-navyBlue2">
          1,785,000 <span className="text-lightGray4">TWD</span>
        </p>
      </div>
      <div className="flex items-center gap-6px">
        <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-errorRed2 px-6px py-2px text-errorRed">
          <div className="h-6px w-6px rounded border-3px border-errorRed"></div>
          <p>Credit</p>
        </div>
        <p className="w-200px whitespace-nowrap text-lightGray4">1113- Cash in banks</p>
        <p className="whitespace-nowrap text-navyBlue2">
          1,785,000 <span className="text-lightGray4">TWD</span>
        </p>
      </div>
    </div>
  );

  const journalItem = (
    <tr className="border-b border-lightGray6 text-center align-middle text-lightGray4">
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
        <CalendarIcon timestamp={1712073600} />
      </td>
      {/* Info: (20240418 - Julian) 類型 */}
      <td className="px-16px">{displayedType}</td>
      {/* Info: (20240418 - Julian) 項目 */}
      <td className="px-16px text-left font-medium text-navyBlue2">Buy an apple</td>
      {/* Info: (20240418 - Julian) From / To */}
      <td className="px-16px text-left font-medium text-navyBlue2">PX Mart</td>
      {/* Info: (20240418 - Julian) 金額 */}
      <td className="px-16px">{displayedAmount}</td>
      {/* Info: (20240418 - Julian) 專案 */}
      <td className="px-16px text-left">
        <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
          <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
            BF
          </div>
          <p>BAIFA</p>
        </div>
      </td>
      {/* Info: (20240418 - Julian) 單據編號 */}
      <td className="px-16px text-right font-medium text-darkBlue">20240417-001</td>
    </tr>
  );

  const displayedList = Array.from({ length: 10 }).map(() => journalItem);

  return (
    <table className="my-20px w-full border border-lightGray6">
      {/* Info: (20240418 - Julian) Header */}
      <thead>
        <tr className="bg-white text-left text-sm text-lightGray4">
          {/* Info: (20240419 - Julian) 全選 */}
          <th className="flex justify-center py-8px">
            <input
              type="checkbox"
              className="relative h-4 w-4 border border-tertiaryBlue bg-white accent-tertiaryBlue"
            />
          </th>
          <th className="text-center">Date</th>
          <th className="px-16px">Type</th>
          <th className="px-16px">Particulars</th>
          <th className="px-16px">From / To</th>
          <th className="px-16px">Amount</th>
          <th className="px-16px">Project</th>
          <th className="px-16px text-right">Voucher No</th>
        </tr>
      </thead>

      {/* Info: (20240418 - Julian) Body */}
      <tbody>{displayedList}</tbody>
    </table>
  );
};

export default JournalList;
