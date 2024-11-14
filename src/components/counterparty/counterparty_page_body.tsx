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
      params: { companyId: selectedCompany?.id },
      query: queryCondition,
    },
    false,
    true
  );
  const fetchCounterpartyData = async () => {
    if (!selectedCompany?.id) {
      // eslint-disable-next-line no-console
      console.error('公司 ID 不存在，無法呼叫 API');
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('Fetching counterparty data...');
      const response = await getCounterpartyList({
        params: { companyId: selectedCompany.id },
        query: queryCondition,
      });
      // 檢查 response 的結構
      // eslint-disable-next-line no-console
      console.log('完整的 response:', response);

      // 檢查 response.success 是否為 true
      if (!response.success) {
        // eslint-disable-next-line no-console
        console.error('API response 不成功:', response);
        return;
      }

      // 檢查 response.data 是否有正確的結構
      const responseData = response.data as { data: ICounterparty[] };
      //  const responseData = response.data as { data: { data: ICounterparty[] } };

      if (Array.isArray(responseData.data)) {
        // eslint-disable-next-line no-console
        console.log('成功取得交易夥伴列表:', responseData.data);
        setCounterparties(responseData.data);
      } else {
        // eslint-disable-next-line no-console
        console.error('responseData 結構不正確:', responseData);
      }

      // if (!responseData.data || !Array.isArray(responseData.data.data)) {
      //   // eslint-disable-next-line no-console
      //   console.error('responseData 結構不正確:', responseData);
      //   return;
      // }

      // 若以上檢查都通過，則設定交易夥伴列表
      // eslint-disable-next-line no-console
      // console.log('成功取得交易夥伴列表:', responseData.data.data);
      // setCounterparties(responseData.data.data);

      //   const responseData = response.data as { data: { data: ICounterparty[] } };
      //   if (response.success && Array.isArray(responseData.data.data)) {
      //     // eslint-disable-next-line no-console
      //     console.log('成功取得交易夥伴列表:', responseData.data.data);
      //     setCounterparties(responseData.data.data); // 設定交易夥伴列表
      //   } else {
      //     // eslint-disable-next-line no-console
      //     console.error('取回交易夥伴列表失敗', response);
      //   }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching data:', error);
    }
  };

  // Info: (20241112 - Anna) 呼叫 API 並儲存回傳資料到狀態
  useEffect(() => {
    fetchCounterpartyData();
  }, [selectedCompany]);

  const handleModalOpen = () => {
    setIsModalOpen(true); // Info: (20241106 - Anna) Function to open the modal
  };

  const handleModalClose = () => {
    setIsModalOpen(false); // Info: (20241106 - Anna)  Function to close the modal
  };

  const handleSave = async () => {
    // Info: (20241106 - Anna) Handle the data from the modal
    setIsModalOpen(false); // Info: (20241106 - Anna) Close modal after saving
    setSearchQuery(''); // Info: (20241113 - Anna) 清空搜尋條件
    await fetchCounterpartyData(); // Info: (20241113 - Anna) 重新加載交易夥伴列表
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
        <CounterpartyList
          searchQuery={searchQuery}
          counterparties={counterparties}
          handleSave={handleSave}
        />
      </div>
      {isModalOpen && ( // Info: (20241106 - Anna) Render modal if open
        <AddCounterPartyModal onClose={handleModalClose} onSave={handleSave} />
      )}
    </div>
  );
};

export default CounterpartyPageBody;
