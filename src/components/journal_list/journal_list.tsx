import { IJournal } from '@/interfaces/journal';
import JournalItem from '@/components/journal_item/journal_item';

const JournalList = ({ journals }: { journals: IJournal[] }) => {
  // ToDo: (20240418 - Julian) replace with prop
  // const displayedList = Array.from({ length: 10 }, (_, index) => <JournalItem key={`${index}`} />);
  const displayedList = journals.map((journal) => (
    <JournalItem key={journal.id} journal={journal} />
  ));

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
