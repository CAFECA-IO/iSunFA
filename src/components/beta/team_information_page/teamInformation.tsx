import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { ITeam } from '@/interfaces/team';
import { Button } from '@/components/button/button';
import { FiEdit } from 'react-icons/fi';
import TeamNameEditModal from '@/components/beta/team_information_page/team_name_edit_modal';
import AboutEditModal from '@/components/beta/team_information_page/about_team_edit_modal';
import TeamProfileEditModal from '@/components/beta/team_information_page/team_profile_edit_modal';
import TeamBankAccountEditModal from '@/components/beta/team_information_page/bank_account_edit_modal';
import { useRouter } from 'next/router';

interface teamInfoProps {
  teamInfo: ITeam;
  setTeamInfo: (team: ITeam) => void;
}

const TeamInformation = ({ teamInfo, setTeamInfo }: teamInfoProps) => {
  const { t } = useTranslation(['team']);
  const router = useRouter();

  // Info:(20250225 - Anna) Team Name 彈窗狀態
  const [isNameEditModalOpen, setIsNameEditModalOpen] = useState(false);
  // Info:(20250225 - Anna) 開關 Team Name 彈窗的函數
  const openNameEditModal = () => setIsNameEditModalOpen(true);
  const closeNameEditModal = () => setIsNameEditModalOpen(false);

  // Info:(20250225 - Anna) Team Description 彈窗狀態
  const [isDescriptionEditModalOpen, setIsDescriptionEditModalOpen] = useState(false);
  // Info:(20250225 - Anna) 開關 Team Name 彈窗的函數
  const openDescriptionEditModal = () => setIsDescriptionEditModalOpen(true);
  const closeDescriptionEditModal = () => setIsDescriptionEditModalOpen(false);

  // Info:(20250225 - Anna) Team Profile 彈窗狀態
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  // Info:(20250225 - Anna) 開關 Team Name 彈窗的函數
  const openProfileEditModal = () => setIsProfileEditModalOpen(true);
  const closeProfileEditModal = () => setIsProfileEditModalOpen(false);

  // Info:(20250225 - Anna) Team Bank Account 彈窗狀態
  const [isBankAccountEditModalOpen, setIsBankAccountEditModalOpen] = useState(false);
  // Info:(20250225 - Anna) 開關 Team Name 彈窗的函數
  const openBankAccountEditModal = () => setIsBankAccountEditModalOpen(true);
  const closeBankAccountEditModal = () => setIsBankAccountEditModalOpen(false);

  return (
    <section className="flex flex-auto flex-col gap-8px">
      <div className="grid grid-cols-2 items-center gap-y-10">
        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:CREATE_TEAM_MODAL.TEAM_NAME')}
        </div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.name.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.name.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={openNameEditModal}
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.ABOUT')}
        </div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.about.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.about.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={openDescriptionEditModal}
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.TEAM_PROFILE')}
        </div>
        <div className="text-right font-semibold">
          <a
            href={teamInfo.profile.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {teamInfo.profile.value}
          </a>
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.profile.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={openProfileEditModal}
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.TEAM_PLAN')}
        </div>
        <div className="text-right">
          <span className="rounded-full bg-navy-blue-500 px-3 py-2 text-sm font-semibold text-white">
            {teamInfo.planType.value}
          </span>
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.planType.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={() => router.push('/users/subscriptions')} // Info:(20250226 - Anna) 點擊後導航
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.TEAM_MEMBER')}
        </div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.totalMembers}{' '}
          {t(
            teamInfo.totalMembers > 1
              ? 'team:TEAM_INFO_PAGE.MEMBER_PLURAL'
              : 'team:TEAM_INFO_PAGE.MEMBER_SINGLE'
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.LIBRARIES')}
        </div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.totalAccountBooks}{' '}
          {t(
            teamInfo.totalAccountBooks > 1
              ? 'team:TEAM_INFO_PAGE.LEDGER_PLURAL'
              : 'team:TEAM_INFO_PAGE.LEDGER_SINGLE'
          )}
        </div>

        {teamInfo.bankAccount.value !== '-' && (
          <>
            <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
              {t('team:TEAM_INFO_PAGE.TEAM_BANK_ACCOUNT')}
            </div>
            <div className="text-right font-semibold text-neutral-600">
              {teamInfo.bankAccount.value}
              {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
              {teamInfo.bankAccount.editable && (
                <Button
                  type="button"
                  variant="tertiary"
                  size="defaultSquare"
                  className="ml-4"
                  onClick={openBankAccountEditModal}
                >
                  <FiEdit size={16} />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      {/* Info:(20250225 - Anna) 彈窗 */}
      {/* Info:(20250225 - Anna) Name 彈窗 */}
      {isNameEditModalOpen && (
        <TeamNameEditModal
          isOpen={isNameEditModalOpen}
          onClose={closeNameEditModal} // Info:(20250225 - Anna) 點擊關閉時觸發函數
          onSave={(newName) => {
            // Info:(20250307 - Anna) setTeamInfo，確保即時更新 UI。
            setTeamInfo({ ...teamInfo, name: { ...teamInfo.name, value: newName } });
            closeNameEditModal();
          }}
          initialName={teamInfo.name.value} // Info:(20250224 - Anna) 傳入當前的 Team Name
          teamId={teamInfo.id}
        />
      )}

      {/* Info:(20250225 - Anna) Description 彈窗 */}
      {isDescriptionEditModalOpen && (
        <AboutEditModal
          isOpen={isDescriptionEditModalOpen}
          onClose={closeDescriptionEditModal} // Info:(20250225 - Anna) 點擊關閉時觸發函數
          onSave={(newDescription) => {
            // Info:(20250307 - Anna) setTeamInfo，確保即時更新 UI。
            setTeamInfo({ ...teamInfo, about: { ...teamInfo.about, value: newDescription } });
            closeDescriptionEditModal();
          }}
          initialDescription={teamInfo.about.value} // Info:(20250224 - Anna) 傳入當前的 Team Description
          teamId={teamInfo.id}
        />
      )}

      {/* Info:(20250225 - Anna) Profile 彈窗 */}
      {isProfileEditModalOpen && (
        <TeamProfileEditModal
          isOpen={isProfileEditModalOpen}
          onClose={closeProfileEditModal} // Info:(20250225 - Anna) 點擊關閉時觸發函數
          onSave={(newProfile) => {
            // Info:(20250307 - Anna) setTeamInfo，確保即時更新 UI。
            setTeamInfo({ ...teamInfo, profile: { ...teamInfo.profile, value: newProfile } });
            closeProfileEditModal();
          }}
          initialProfile={teamInfo.profile.value} // Info:(20250224 - Anna) 傳入當前的 Team Profile
          teamId={teamInfo.id}
        />
      )}

      {/* Info:(20250225 - Anna) BankAccount 彈窗 */}
      {isBankAccountEditModalOpen && (
        <TeamBankAccountEditModal
          isOpen={isBankAccountEditModalOpen}
          onClose={closeBankAccountEditModal} // Info:(20250225 - Anna) 點擊關閉時觸發函數
          onSave={(newBankAccount) => {
            // Info:(20250307 - Anna) setTeamInfo，確保即時更新 UI。
            setTeamInfo({
              ...teamInfo,
              bankAccount: { ...teamInfo.bankAccount, value: newBankAccount },
            });
            closeBankAccountEditModal();
          }}
          initialBankAccount={teamInfo.bankAccount.value} // Info:(20250224 - Anna) 傳入當前的 Team BankAccount
          teamId={teamInfo.id}
        />
      )}
    </section>
  );
};

export default TeamInformation;
