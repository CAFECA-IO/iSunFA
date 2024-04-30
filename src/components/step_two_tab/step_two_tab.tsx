import NewJournalForm from '../new_journal_form/new_journal_form';

const StepTwoTab = () => {
  return (
    <div className="mb-100px flex flex-col gap-20px">
      {/* Info: (20240426 - Julian) form part */}
      <NewJournalForm />
      {/* Info: (20240426 - Julian) temp journal list */}
      {/* Info: (20240429 - Julian) <RecordHoldingArea /> 暫時不需要 */}
    </div>
  );
};

export default StepTwoTab;
