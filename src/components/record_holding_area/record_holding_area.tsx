import { useTranslation } from 'next-i18next';
import Image from 'next/image';
// import { PiCopySimple } from 'react-icons/pi';
// import { FiEdit } from 'react-icons/fi';
// import { RiDeleteBinLine } from 'react-icons/ri';
// import { useAccountingCtx } from '@/contexts/accounting_context';

// ToDo: (20240430 - Julian) 預計刪除

const RecordHoldingArea = () => {
  const { t } = useTranslation('common');
  // const { tempJournalList, duplicateTempJournal, removeTempJournal } = useAccountingCtx();

  // const displayTempListMobile = tempJournalList.map((journal) => {
  //   const duplicateTempClickHandler = () => duplicateTempJournal(journal.id);
  //   const deleteTempClickHandler = () => removeTempJournal(journal.id);

  //   return (
  //     <div
  //       key={journal.id}
  //       className="flex flex-col items-start gap-y-16px rounded-xs border border-lightGray6 bg-white px-20px py-10px text-sm text-navyBlue2"
  //     >
  //       {/* Info: (20240426 - Julian) sort */}
  //       <div className="font-medium">{journal.basicInfo.description}</div>
  //       {/* Info: (20240426 - Julian) particulars */}
  //       <div className="font-semibold">
  //         {journal.payment.totalPrice}
  //         <span className="ml-4px text-lightGray4">TWD</span>
  //       </div>
  //       {/* ToDo: (20240426 - Julian) accounting title */}
  //       <div className="font-medium">Accounting Title</div>
  //       {/* ToDo: (20240426 - Julian) event code */}
  //       <div className="font-semibold text-primaryYellow">{journal.basicInfo.eventType}</div>
  //       {/* Info: (20240426 - Julian) action */}
  //       <div className="ml-auto flex items-center gap-16px">
  //         {/* Info: (20240426 - Julian) copy button */}
  //         <button
  //           type="button"
  //           className="text-darkBlue2 hover:text-primaryYellow"
  //           onClick={duplicateTempClickHandler}
  //         >
  //           <PiCopySimple size={20} />
  //         </button>
  //         {/* ToDo: (20240426 - Julian) edit button */}
  //         <button type="button" className="text-darkBlue2 hover:text-primaryYellow">
  //           <FiEdit size={16} />
  //         </button>
  //         {/* Info: (20240426 - Julian) delete button */}
  //         <button
  //           type="button"
  //           className="text-darkBlue2 hover:text-primaryYellow"
  //           onClick={deleteTempClickHandler}
  //         >
  //           <RiDeleteBinLine size={20} />
  //         </button>
  //       </div>
  //     </div>
  //   );
  // });

  // // Info: (20240426 - Julian) 電腦版暫存列表
  // const displayTempListDesktop = tempJournalList.map((journal, index) => {
  //   const duplicateTempClickHandler = () => duplicateTempJournal(journal.id);
  //   const deleteTempClickHandler = () => removeTempJournal(journal.id);

  //   return (
  //     <div
  //       key={journal.id}
  //       className="flex items-center justify-between border border-lightGray6 bg-white"
  //     >
  //       {/* Info: (20240426 - Julian) sort */}
  //       <div className="flex w-1/15 items-center justify-center py-6px">
  //         <div className="flex h-55px w-55px items-center justify-center rounded-sm border-2 border-darkBlue2 text-2xl font-bold text-darkBlue2">
  //           {index + 1}
  //         </div>
  //       </div>
  //       {/* Info: (20240426 - Julian) particulars */}
  //       <div className="w-1/8 text-center font-medium text-navyBlue2">
  //         {journal.basicInfo.description}
  //       </div>
  //       {/* Info: (20240426 - Julian) amount */}
  //       <div className="w-1/8 text-center font-medium text-navyBlue2">
  //         {journal.payment.totalPrice}
  //         <span className="ml-4px text-lightGray4">TWD</span>
  //       </div>
  //       {/* ToDo: (20240426 - Julian) accounting title */}
  //       <div className="w-1/8 text-center font-medium text-navyBlue2">Accounting Title</div>
  //       {/* ToDo: (20240426 - Julian) event code */}
  //       <div className="w-1/8 text-center font-medium text-primaryYellow">
  //         {journal.basicInfo.eventType}
  //       </div>
  //       {/* Info: (20240426 - Julian) action */}
  //       <div className="flex w-1/8 items-center justify-center gap-16px">
  //         {/* Info: (20240426 - Julian) copy button */}
  //         <button
  //           type="button"
  //           className="text-darkBlue2 hover:text-primaryYellow"
  //           onClick={duplicateTempClickHandler}
  //         >
  //           <PiCopySimple size={20} />
  //         </button>
  //         {/* ToDo: (20240426 - Julian) edit button */}
  //         <button type="button" className="text-darkBlue2 hover:text-primaryYellow">
  //           <FiEdit size={16} />
  //         </button>
  //         {/* Info: (20240426 - Julian) delete button */}
  //         <button
  //           type="button"
  //           className="text-darkBlue2 hover:text-primaryYellow"
  //           onClick={deleteTempClickHandler}
  //         >
  //           <RiDeleteBinLine size={20} />
  //         </button>
  //       </div>
  //     </div>
  //   );
  // });

  return (
    <>
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/tape.svg" width={16} height={16} alt="tape_icon" />
          <p>{t('JOURNAL.ADDED_JOURNAL')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240426 - Julian) Desktop version */}
      <div className="hidden w-full flex-col gap-y-8px md:flex">
        {/* Info: (20240426 - Julian) Header */}
        {/*         <div className="flex justify-between border border-lightGray6 bg-white px-10px py-8px text-center text-sm font-semibold text-lightGray4">
          <p className="w-1/15">Sort</p>
          <p className="w-1/8">Particulars</p>
          <p className="w-1/8">Amount</p>
          <p className="w-1/8">Accounting Title</p>
          <p className="w-1/8">Event Code</p>
          <p className="w-1/8">Action</p>
        </div> */}

        {/* Info: (20240426 - Julian) Content */}
        {/*         <div className="flex max-h-230px flex-col gap-y-8px overflow-y-auto">
          {displayTempListDesktop}
        </div> */}
      </div>

      {/* Info: (20240426 - Julian) Mobile version */}
      {/* <div className="flex w-full flex-col gap-y-8px md:hidden">{displayTempListMobile}</div> */}
    </>
  );
};

export default RecordHoldingArea;
