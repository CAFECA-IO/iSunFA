import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { useTranslation } from 'next-i18next';

interface AboutEditModalProps {
  isOpen: boolean;
  initialDescription: string;
  onClose: () => void;
  onSave: (newDescription: string) => void;
}

const AboutEditModal: React.FC<AboutEditModalProps> = ({
  isOpen,
  initialDescription,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation(['team']);
  const [teamDescription, setTeamDescription] = useState(initialDescription);
  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    setHasChanges(teamDescription.trim() !== initialDescription.trim());
  }, [teamDescription, initialDescription]);

  // Info:(20250225 - Anna) 若 isOpen = false，不渲染 Modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-96 rounded-md bg-white p-10 shadow-lg">
        {/* Info:(20250225 - Anna) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-10 top-12 text-neutral-500 hover:text-black"
          onClick={onClose}
        >
          <RxCross1 size={16} />
        </button>

        {/* Info:(20250225 - Anna) 標題 */}
        <h2 className="text-center text-lg font-semibold text-neutral-600">
          {t('team:TEAM_INFO_PAGE.ADD_DESCRIPTION')}
        </h2>

        {/* Info:(20250225 - Anna) 輸入框 */}
        <div className="mt-6 flex flex-col">
          <label htmlFor="team-description" className="mb-2 text-sm font-semibold text-neutral-300">
            {t('team:TEAM_INFO_PAGE.ABOUT')}
          </label>

          <input
            id="team-description"
            type="text"
            className="w-full rounded-sm border border-navy-blue-100 p-2"
            value={teamDescription}
            placeholder={
              initialDescription.trim() === ''
                ? t('team:TEAM_INFO_PAGE.DESCRIPTION_PLACEHOLDER')
                : initialDescription
            }
            onChange={(e) => setTeamDescription(e.target.value)}
          />
        </div>

        {/* Info:(20250225 - Anna) 取消 */}
        <div className="mt-10 flex justify-end gap-4">
          <button
            type="button"
            className="text-sm font-medium text-neutral-700 hover:underline"
            onClick={onClose}
          >
            {t('common:COMMON.CANCEL')}
          </button>
          {/* Info:(20250225 - Anna) 保存 */}
          <Button
            type="button"
            variant="tertiary"
            className="flex items-center gap-1 px-4 py-2 disabled:bg-gray-300"
            disabled={!hasChanges}
            onClick={() => onSave(teamDescription)}
          >
            {t('common:COMMON.SAVE')}
            <BiSave size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AboutEditModal;
