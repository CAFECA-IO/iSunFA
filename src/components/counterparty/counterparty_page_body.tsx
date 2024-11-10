import React, { useState, useEffect } from 'react';
import CounterpartyList from '@/components/counterparty/counterparty_list';
import SearchInput from '@/components/filter_section/search_input';
import { IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import AddCounterPartyModal from '@/components/counterparty/add_counterparty_modal';
import { Button } from '@/components/button/button';
import { MdPersonAddAlt1 } from 'react-icons/md';
import { useUserCtx } from '@/contexts/user_context';

const CounterpartyPageBody = () => {
  const { selectedCompany } = useUserCtx();

  const queryCondition = {
    limit: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
    forUser: true,
    sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
    sortOrder: 'asc',
  };

  const { trigger: getCounterpartyList, data: counterpartyList } = APIHandler<IPaginatedAccount>(
    APIName.COUNTERPARTY_LIST,
    {
      params: { companyId: selectedCompany?.id || 0 }, // Info: (20241105 - Anna) 如果為 null，使用一個預設值
      query: queryCondition,
    },
    false,
    true
  );
  const [searchQuery, setSearchQuery] = useState<string>(''); // Info: (20241106 - Anna) 定義搜尋關鍵字狀態
  const [isModalOpen, setIsModalOpen] = useState(false); // Info: (20241106 - Anna) State to handle modal visibility

  useEffect(() => {
    getCounterpartyList({ query: { ...queryCondition } });
  }, []);

  useEffect(() => {
    if (counterpartyList) {
      // eslint-disable-next-line no-console
      // console.log('API Response:', accountTitleList); // Info: (20241105 - Anna) 查看原始資料
      // Info: (20241105 - Anna) 初始化臨時陣列來分類不同類型的會計科目
      const assets: string[] = [];
      const liabilities: string[] = [];
      const equities: string[] = [];
      const revenues: string[] = [];
      const costs: string[] = [];
      const expenses: string[] = [];
      const incomes: string[] = [];
      const otherComprehensiveIncomes: string[] = [];

      // Info: (20241105 - Anna) 遍歷 accountTitleList.data，依據 type 將科目分類
      counterpartyList.data.forEach((counterparty) => {
        const counterpartyName = `${counterparty.code} ${counterparty.name}`;
        switch (counterparty.type) {
          case 'asset':
            assets.push(counterpartyName);
            break;
          case 'liability':
            liabilities.push(counterpartyName);
            break;
          case 'equity':
            equities.push(counterpartyName);
            break;
          case 'revenue':
            revenues.push(counterpartyName);
            break;
          case 'cost':
            costs.push(counterpartyName);
            break;
          case 'expense':
            expenses.push(counterpartyName);
            break;
          case 'income':
            incomes.push(counterpartyName);
            break;
          case 'otherComprehensiveIncome':
            otherComprehensiveIncomes.push(counterpartyName);
            break;
          default:
            break;
        }
      });
    }
  }, [counterpartyList]);

  const handleModalOpen = () => {
    setIsModalOpen(true); // Info: (20241106 - Anna) Function to open the modal
  };

  const handleModalClose = () => {
    setIsModalOpen(false); // Info: (20241106 - Anna)  Function to close the modal
  };

  const handleSave = () => {
    // Info: (20241106 - Anna) Handle the data from the modal
    setIsModalOpen(false); // Info: (20241106 - Anna) Close modal after saving
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        <div className="flex items-center gap-10">
          <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <Button
            type="button"
            variant="tertiary"
            className="hidden items-center gap-4px px-4 py-8px md:flex"
            onClick={handleModalOpen}
          >
            <MdPersonAddAlt1 size={24} />
            Add New
          </Button>
        </div>
        <CounterpartyList searchQuery={searchQuery} />
      </div>
      {isModalOpen && ( // Info: (20241106 - Anna) Render modal if open
        <AddCounterPartyModal onClose={handleModalClose} onSave={handleSave} />
      )}
    </div>
  );
};

export default CounterpartyPageBody;
