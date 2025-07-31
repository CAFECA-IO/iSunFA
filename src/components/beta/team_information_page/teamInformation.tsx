import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { FiEdit } from 'react-icons/fi';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { ITeam, TeamRole } from '@/interfaces/team';
import { Button } from '@/components/button/button';
import TeamNameEditModal from '@/components/beta/team_information_page/team_name_edit_modal';
import AboutEditModal from '@/components/beta/team_information_page/about_team_edit_modal';
import TeamProfileEditModal from '@/components/beta/team_information_page/team_profile_edit_modal';
import TeamBankAccountEditModal from '@/components/beta/team_information_page/bank_account_edit_modal';

interface teamInfoProps {
  teamInfo: ITeam;
  setTeamInfo: (team: ITeam) => void;
}

const TeamInformation = ({ teamInfo, setTeamInfo }: teamInfoProps) => {
  const { t } = useTranslation(['team']);
  const router = useRouter();

  // Info:(20250328 - Julian) 按鈕權限
  const modifyName = convertTeamRoleCanDo({
    teamRole: teamInfo.role,
    canDo: TeamPermissionAction.MODIFY_NAME,
  });
  const modifyAbout = convertTeamRoleCanDo({
    teamRole: teamInfo.role,
    canDo: TeamPermissionAction.MODIFY_ABOUT,
  });
  const modifyProfile = convertTeamRoleCanDo({
    teamRole: teamInfo.role,
    canDo: TeamPermissionAction.MODIFY_PROFILE,
  });
  const modifyPlan = convertTeamRoleCanDo({
    teamRole: teamInfo.role,
    canDo: TeamPermissionAction.MODIFY_PLAN,
  });
  const modifyBankAccount = convertTeamRoleCanDo({
    teamRole: teamInfo.role,
    canDo: TeamPermissionAction.MODIFY_BANK_ACCOUNT,
  });

  // Info:(20250328 - Julian) 是否顯示編輯按鈕
  const visibleEditButton = teamInfo.role === TeamRole.OWNER || teamInfo.role === TeamRole.ADMIN;

  // Info:(20250328 - Julian) 是否顯示 1.編輯訂閱方案按鈕 2.編輯銀行帳戶按鈕
  const visibleSubscribeButton = teamInfo.role === TeamRole.OWNER;

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
        <div className="flex items-center justify-end gap-16px text-right font-semibold text-text-neutral-primary">
          {teamInfo.name.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.name.editable && visibleEditButton && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              disabled={!modifyName.can}
              onClick={openNameEditModal}
              className="shrink-0"
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.ABOUT')}
        </div>
        <div className="flex items-center justify-end gap-16px text-right font-semibold text-text-neutral-primary">
          {teamInfo.about.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.about.editable && visibleEditButton && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              disabled={!modifyAbout.can}
              onClick={openDescriptionEditModal}
              className="shrink-0"
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
          {teamInfo.profile.editable && visibleEditButton && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              disabled={!modifyProfile.can}
              onClick={openProfileEditModal}
              className="shrink-0"
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.TEAM_PLAN')}
        </div>
        <div className="text-right">
          <span className="rounded-full bg-badge-surface-strong-secondary px-3 py-2 text-sm font-semibold text-badge-text-invert">
            {t(`subscriptions:PLAN_NAME.${teamInfo.planType.value}`)}
          </span>
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.planType.editable && visibleSubscribeButton && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              disabled={!modifyPlan.can}
              onClick={() => router.push(`/users/subscriptions/${teamInfo.id}`)} // Info:(20250226 - Anna) 點擊後導航
              className="shrink-0"
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
          {t('team:TEAM_INFO_PAGE.TEAM_MEMBER')}
        </div>
        <div className="flex items-center justify-end gap-16px text-right font-semibold text-text-neutral-primary">
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
        <div className="flex items-center justify-end gap-16px text-right font-semibold text-text-neutral-primary">
          {teamInfo.totalAccountBooks}{' '}
          {t(
            teamInfo.totalAccountBooks > 1
              ? 'team:TEAM_INFO_PAGE.LEDGER_PLURAL'
              : 'team:TEAM_INFO_PAGE.LEDGER_SINGLE'
          )}
        </div>

        {visibleSubscribeButton && (
          <>
            <div className="flex h-11 items-center text-left font-semibold text-neutral-300">
              {t('team:TEAM_INFO_PAGE.TEAM_BANK_ACCOUNT')}
            </div>
            <div className="flex items-center justify-end gap-16px text-right font-semibold text-text-neutral-primary">
              {teamInfo.bankAccount.value}
              {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
              {teamInfo.bankAccount.editable && (
                <Button
                  type="button"
                  variant="tertiary"
                  size="defaultSquare"
                  disabled={!modifyBankAccount.can}
                  onClick={openBankAccountEditModal}
                  className="shrink-0"
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
