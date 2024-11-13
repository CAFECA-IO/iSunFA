import React, { useState, useEffect } from 'react';
import CounterpartyList from '@/components/counterparty/counterparty_list';
import SearchInput from '@/components/filter_section/search_input';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import AddCounterPartyModal from '@/components/counterparty/add_counterparty_modal';
import { Button } from '@/components/button/button';
import { MdPersonAddAlt1 } from 'react-icons/md';
import { useUserCtx } from '@/contexts/user_context';
import { ICounterparty } from '@/interfaces/counterparty';

const CounterpartyPageBody = () => {
  const { selectedCompany } = useUserCtx();

  // Info: (20241112 - Anna) 新增用於儲存 API 回傳資料的狀態，並定義 counterpartyList 為 ICounterparty 型別的陣列
  const [counterparties, setCounterparties] = useState<ICounterparty[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(''); // Info: (20241106 - Anna) 定義搜尋關鍵字狀態
  const [isModalOpen, setIsModalOpen] = useState(false); // Info: (20241106 - Anna) State to handle modal visibility
  const queryCondition = {
    limit: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
    forUser: true,
    // sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
    // sortOrder: 'asc',
  };

  // Info: (20241112 - Anna) 使用 APIHandler 來呼叫 COUNTERPARTY_LIST API
  const { trigger: getCounterpartyList } = APIHandler(
    APIName.COUNTERPARTY_LIST,
    {
      params: { companyId: selectedCompany?.id || 10000001 }, // Info: (20241105 - Anna) 如果為 null，使用一個預設值
      query: queryCondition,
    },
    false,
    true
  );

  // Info: (20241112 - Anna) 呼叫 API 並儲存回傳資料到狀態
  useEffect(() => {
    const fetchCounterpartyData = async () => {
      // eslint-disable-next-line no-console
      console.log('Fetching counterparty data...'); // Info: (20241112 - Anna)  調試信息
      const response = await getCounterpartyList({ query: { ...queryCondition } });
      if (response.success && Array.isArray(response.data)) {
        // eslint-disable-next-line no-console
        console.log('Fetched data:', response.data); // Info: (20241112 - Anna) 確認 API 回應資料
        setCounterparties(response.data as ICounterparty[]);
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch data', response); // Info: (20241112 - Anna) 如果失敗，輸出錯誤
      }
    };

    fetchCounterpartyData(); // 執行 API 請求
  }, []); // 空的依賴陣列避免無限循環

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
        {/* Info: (20241112 - Anna) 傳入 API 資料到 CounterpartyList */}
        <CounterpartyList searchQuery={searchQuery} counterparties={counterparties} />
      </div>
      {isModalOpen && ( // Info: (20241106 - Anna) Render modal if open
        <AddCounterPartyModal onClose={handleModalClose} onSave={handleSave} />
      )}
    </div>
  );
};

export default CounterpartyPageBody;
