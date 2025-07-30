import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import BankCodeDropdown from '@//components/beta/team_information_page/bank_code_dropdown';

interface TeamBankAccountEditModalProps {
  isOpen: boolean;
  initialBankAccount: string;
  onClose: () => void;
  onSave: (newBankAccount: string) => void;
  teamId: number; // Info:(20250301 - Anna) teamId 作為參數
}

// Info:(20250310 - Anna) 來自金管會銀行局
const bankCodes = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '土地銀行' },
  { code: '006', name: '合庫商銀' },
  { code: '007', name: '第一銀行' },
  { code: '008', name: '華南銀行' },
  { code: '009', name: '彰化銀行' },
  { code: '011', name: '上海銀行' },
  { code: '012', name: '台北富邦' },
  { code: '013', name: '國泰世華' },
  { code: '016', name: '高雄銀行' },
  { code: '017', name: '兆豐銀行' },
  { code: '021', name: '花旗(台灣)銀行' },
  { code: '050', name: '臺灣企銀' },
  { code: '052', name: '渣打商銀' },
  { code: '053', name: '台中銀行' },
  { code: '054', name: '京城商銀' },
  { code: '081', name: '滙豐(台灣)銀行' },
  { code: '102', name: '華泰銀行' },
  { code: '103', name: '臺灣新光商銀' },
  { code: '108', name: '陽信銀行' },
  { code: '118', name: '板信銀行' },
  { code: '803', name: '聯邦銀行' },
  { code: '806', name: '元大銀行' },
  { code: '807', name: '永豐銀行' },
  { code: '808', name: '玉山銀行' },
  { code: '809', name: '凱基銀行' },
  { code: '810', name: '星展(台灣)銀行' },
  { code: '812', name: '台新銀行' },
  { code: '816', name: '安泰銀行' },
  { code: '822', name: '中國信託' },
];

const TeamBankAccountEditModal: React.FC<TeamBankAccountEditModalProps> = ({
  isOpen,
  initialBankAccount,
  onClose,
  onSave,
  teamId,
}) => {
  const { t } = useTranslation(['team']);

  const extractedBankCode = initialBankAccount.split('-')[0];
  const [bankCode, setBankCode] = useState(
    !extractedBankCode || extractedBankCode === '-' ? '' : extractedBankCode
  );
  const [teamBankAccount, setTeamBankAccount] = useState(initialBankAccount.split('-')[1] || '');

  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    setHasChanges(teamBankAccount.trim() !== initialBankAccount.trim());
  }, [teamBankAccount, initialBankAccount]);

  // Info:(20250301 - Anna) 設置 APIHandler
  const {
    trigger: updateTeamInfoTrigger,
    success,
    error: updateError, // Info:(20250301 - Anna) 更名 `error` 為 `updateError`
  } = APIHandler(APIName.UPDATE_TEAM_BY_ID, {
    params: { teamId },
    body: { bankAccount: `${bankCode}-${teamBankAccount}` }, // Info:(20250301 - Anna) 更新bankAccount
  });

  // Info:(20250301 - Anna) 監聽 API 成功或失敗
  useEffect(() => {
    if (success) {
      onSave(`${bankCode}-${teamBankAccount}`);
      onClose();
    }
  }, [success, updateError, onSave, onClose, teamBankAccount]);

  // Info:(20250301 - Anna) 提交變更
  const updateTeamBankAccountHandler = async () => {
    if (!hasChanges) return; // Info:(20250301 - Anna) 沒有變更就不發送請求
    const response = await updateTeamInfoTrigger(); // Info:(20250301 - Anna) 觸發 API
    if (response?.success) {
      // Info:(20250301 - Anna) 確保 API 成功後才更新 UI
      onSave(`${bankCode}-${teamBankAccount}`); // Info:(20250301 - Anna) 通知父組件
      onClose(); // Info:(20250301 - Anna) 關閉 Modal
    }
  };

  // Info:(20250225 - Anna) 若 isOpen = false，不渲染 Modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-90vw rounded-md bg-white px-lv-5 py-16px shadow-lg tablet:w-480px tablet:p-10">
        <div className="relative flex items-center justify-center">
          {/* Info:(20250225 - Anna) 關閉按鈕 */}
          <button
            type="button"
            className="absolute right-0 text-icon-surface-single-color-primary"
            onClick={onClose}
          >
            <RxCross2 size={24} />
          </button>

          {/* Info:(20250225 - Anna) 標題 */}
          <h2 className="text-center text-xl font-semibold text-card-text-primary">
            {t('team:TEAM_INFO_PAGE.ADD_BANK_ACCOUNT')}
          </h2>
        </div>

        {/* Info:(20250307 - Anna) 輸入框 */}
        <div className="mt-28px flex flex-col tablet:mt-6">
          <label
            htmlFor="team-bank-account"
            className="mb-2 text-sm font-semibold text-neutral-300"
          >
            {t('team:TEAM_INFO_PAGE.BANK_ACCOUNT')}
          </label>
        </div>
        <div className="flex w-full">
          {/* Info:(20250307 - Anna) 銀行代號下拉選單 */}
          <div className="relative">
            <BankCodeDropdown
              options={bankCodes}
              selectedValue={bankCode}
              onChange={setBankCode}
              width="w-130px"
            />
          </div>
          {/* Info:(20250307 - Anna) 銀行帳號輸入框 */}
          <div className="w-full">
            <input
              id="team-bank-account"
              type="text"
              className="h-44px w-full rounded-r-sm border border-l-0 border-input-stroke-input p-2 pl-6 placeholder:text-sm placeholder:text-input-text-input-placeholder focus:outline-none"
              value={teamBankAccount}
              placeholder={
                initialBankAccount.trim() === '' || initialBankAccount.trim() === '-'
                  ? t('team:TEAM_INFO_PAGE.BANK_ACCOUNT_NUMBER')
                  : initialBankAccount.split('-')[1] || '' // Info:(20250310 - Anna) 只顯示 `-` 後的部分
              }
              onChange={(e) => setTeamBankAccount(e.target.value)}
            />
          </div>
        </div>

        {/* Info:(20250225 - Anna) 取消 */}
        <div className="mt-28px flex justify-end gap-4 tablet:mt-10">
          <Button type="button" variant="tertiaryOutline" size="medium" onClick={onClose}>
            {t('common:COMMON.CANCEL')}
          </Button>
          {/* Info:(20250225 - Anna) 保存 */}
          <Button
            type="button"
            variant="tertiary"
            size="medium"
            disabled={!hasChanges}
            onClick={updateTeamBankAccountHandler} // Info:(20250301 - Anna) 讓 API 先執行
          >
            {t('common:COMMON.SAVE')}
            <BiSave size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamBankAccountEditModal;
