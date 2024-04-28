import NewJournalForm from '../new_journal_form/new_journal_form';
import RecordHoldingArea from '../record_holding_area/record_holding_area';

const StepTwoTab = () => {
  return (
    <div className="mb-100px flex flex-col gap-20px">
      {/* Info: (20240426 - Julian) form part */}
      <NewJournalForm />
      {/* Info: (20240426 - Julian) temp journal list */}
      <RecordHoldingArea />
    </div>
  );
};

export default StepTwoTab;
