import React, { useState, useEffect } from 'react';
import CounterpartyList from '@/components/counterparty/counterparty_list';
import SearchInput from '@/components/filter_section/search_input';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { MdPersonAddAlt1 } from 'react-icons/md';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ICounterparty } from '@/interfaces/counterparty';
import { IPaginatedData } from '@/interfaces/pagination';

const CounterpartyPageBody = () => {
  const { t } = useTranslation(['search', 'common', 'settings']);

  const { connectedAccountBook } = useUserCtx();
  const { addCounterPartyModalVisibilityHandler, addCounterPartyModalDataHandler } =
    useModalContext();

  // Info: (20241112 - Anna) 新增用於儲存 API 回傳資料的狀態，並定義 counterpartyList 為 ICounterparty 型別的陣列
  const [counterparties, setCounterparties] = useState<ICounterparty[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(''); // Info: (20241106 - Anna) 定義搜尋關鍵字狀態
  const queryCondition = {
    limit: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
    forUser: true,
    // sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
    // sortOrder: 'asc',
  };

  // Info: (20241112 - Anna) 使用 APIHandler 來呼叫 COUNTERPARTY_LIST API
  const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
    APIName.COUNTERPARTY_LIST
  );
  const fetchCounterpartyData = async () => {
    if (!connectedAccountBook?.id) {
      return;
    }

    try {
      const response = await getCounterpartyList({
        params: { accountBookId: connectedAccountBook.id },
        query: queryCondition,
      });
      const { success, data: responseData } = response;

      // Info: (20241118 - Anna) 檢查 response.success 是否為 true
      if (!success) {
        return;
      }

      if (responseData && Array.isArray(responseData.data)) {
        setCounterparties(responseData.data);
      } else {
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.error('responseData 結構不正確:', responseData);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching data:', error);
    }
  };

  // Info: (20241112 - Anna) 呼叫 API 並儲存回傳資料到狀態
  useEffect(() => {
    fetchCounterpartyData();
  }, [connectedAccountBook]);

  const handleSave = async () => {
    setSearchQuery(''); // Info: (20241113 - Anna) 清空搜尋條件
    await fetchCounterpartyData(); // Info: (20241113 - Anna) 重新加載交易夥伴列表
  };

  useEffect(() => {
    addCounterPartyModalDataHandler({
      onSave: handleSave,
    });
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        <div className="flex items-center gap-10">
          <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <Button
            type="button"
            variant="tertiary"
            className="hidden items-center gap-4px px-4 py-8px md:flex"
            onClick={addCounterPartyModalVisibilityHandler}
          >
            <MdPersonAddAlt1 size={24} />
            {t('settings:NORMAL.ADD_NEW_CLIENT_SUPPLIER')}
          </Button>
        </div>
        {/* Info: (20241112 - Anna) 傳入 API 資料到 CounterpartyList */}
        <CounterpartyList
          searchQuery={searchQuery}
          counterparties={counterparties}
          handleSave={handleSave}
        />
      </div>
    </div>
  );
};

export default CounterpartyPageBody;
