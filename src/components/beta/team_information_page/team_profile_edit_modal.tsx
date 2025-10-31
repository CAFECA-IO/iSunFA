import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { useTranslation } from 'next-i18next';
import { LuLink } from 'react-icons/lu';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface TeamProfileEditModalProps {
  isOpen: boolean;
  initialProfile: string;
  onClose: () => void;
  onSave: (newProfile: string) => void;
  teamId: number; // Info:(20250301 - Anna) teamId 作為參數
}

const TeamProfileEditModal: React.FC<TeamProfileEditModalProps> = ({
  isOpen,
  initialProfile,
  onClose,
  onSave,
  teamId,
}) => {
  const { t } = useTranslation(['team']);
  const [teamProfile, setTeamProfile] = useState(initialProfile);
  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    setHasChanges(teamProfile.trim() !== initialProfile.trim());
  }, [teamProfile, initialProfile]);

  // Info:(20250301 - Anna) 設置 APIHandler
  const {
    trigger: updateTeamInfoTrigger,
    success,
    error: updateError, // Info:(20250301 - Anna) 更名 `error` 為 `updateError`
  } = APIHandler(APIName.UPDATE_TEAM_BY_ID, {
    params: { teamId },
    body: { profile: teamProfile }, // Info:(20250301 - Anna) 更新profile
  });

  // Info:(20250301 - Anna) 監聽 API 成功或失敗
  useEffect(() => {
    if (success) {
      onSave(teamProfile);
      onClose();
    }
  }, [success, updateError, onSave, onClose, teamProfile]);

  // Info:(20250301 - Anna) 提交變更
  const updateTeamProfileHandler = async () => {
    if (!hasChanges) return; // Info:(20250301 - Anna) 沒有變更就不發送請求
    const response = await updateTeamInfoTrigger(); // Info:(20250301 - Anna) 觸發 API
    if (response?.success) {
      // Info:(20250301 - Anna) 確保 API 成功後才更新 UI
      onSave(teamProfile); // Info:(20250301 - Anna) 通知父組件
      onClose(); // Info:(20250301 - Anna) 關閉 Modal
    }
  };

  // Info:(20250225 - Anna) 若 isOpen = false，不渲染 Modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-90vw rounded-md bg-white px-lv-5 py-16px shadow-lg tablet:w-96 tablet:p-10">
        <div className="relative flex items-center justify-center">
          {/* Info:(20250225 - Anna) 關閉按鈕 */}
          <button
            type="button"
            className="absolute right-0 text-icon-surface-single-color-primary"
            onClick={onClose}
          >
            <RxCross1 size={16} />
          </button>

          {/* Info:(20250225 - Anna) 標題 */}
          <h2 className="text-center text-xl font-semibold text-card-text-primary">
            {t('team:TEAM_INFO_PAGE.TEAM_PROFILE')}
          </h2>
        </div>

        {/* Info:(20250225 - Anna) 輸入框 */}
        <div className="mt-28px flex flex-col tablet:mt-6">
          <label htmlFor="team-profile" className="mb-2 text-sm font-semibold text-neutral-300">
            {t('team:TEAM_INFO_PAGE.TEAM_PROFILE')}
          </label>

          <div className="relative w-full">
            {/* Info:(20250225 - Anna) icon 絕對定位 */}
            <LuLink
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              size={16}
            />
            <input
              id="team-profile"
              type="text"
              className="w-full rounded-sm border border-input-stroke-input p-2 pl-10 text-input-text-input-filled outline-none"
              value={teamProfile}
              placeholder={
                initialProfile.trim() === '' ? t('team:TEAM_INFO_PAGE.LINK') : initialProfile
              }
              onChange={(e) => setTeamProfile(e.target.value)}
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
            onClick={updateTeamProfileHandler} // Info:(20250301 - Anna) 讓 API 先執行
          >
            {t('common:COMMON.SAVE')}
            <BiSave size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamProfileEditModal;
