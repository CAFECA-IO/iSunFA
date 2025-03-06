import { useState, Dispatch, SetStateAction } from 'react';
import { IoCloseOutline, IoMailOutline, IoClose } from 'react-icons/io5';
import { TbUserPlus } from 'react-icons/tb';
import { useTranslation } from 'next-i18next';
import { ITeam, IInviteMemberResponse } from '@/interfaces/team';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface InviteMembersModalProps {
  team: ITeam;
  setIsInviteMembersModalOpen: Dispatch<SetStateAction<boolean>>;
}

const InviteMembersModal = ({ team, setIsInviteMembersModalOpen }: InviteMembersModalProps) => {
  const { t } = useTranslation(['team']);
  const [inputEmail, setInputEmail] = useState<string>('');
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([]);
  const [isEmailNotValid, setIsEmailNotValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20250306 - Liz) 邀請成員 API (add member to team)
  const { trigger: addMemberToTeamAPI } = APIHandler<IInviteMemberResponse>(
    APIName.ADD_MEMBER_TO_TEAM
  );

  const closeInviteMembersModal = () => {
    setIsInviteMembersModalOpen(false);
  };

  const updateInputEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(e.target.value);
    setIsEmailNotValid(false);
  };

  const addEmailToInvite = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputEmail.trim()) {
      // Info: (20250221 - Liz) 簡單的 email 格式驗證
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail);

      if (!isValidEmail) {
        setIsEmailNotValid(true);
        return;
      }

      if (!emailsToInvite.includes(inputEmail)) {
        setEmailsToInvite([...emailsToInvite, inputEmail]);
        setInputEmail('');
      }
    }
  };

  // Info: (20250306 - Liz) 打 API 邀請成員
  const inviteMembers = async () => {
    if (!team) return;
    if (emailsToInvite.length === 0) return;
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { success } = await addMemberToTeamAPI({
        params: { teamId: team.id.toString() },
        body: { emails: emailsToInvite },
      });

      if (!success) throw new Error();
      if (success) {
        setEmailsToInvite([]);
        closeInviteMembersModal();
        // Deprecated: (20250306 - Liz)
        // eslint-disable-next-line no-console
        console.log('邀請成員成功');
      }
    } catch (error) {
      // Deprecated: (20250306 - Liz)
      // eslint-disable-next-line no-console
      console.log('邀請成員失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md">
        <div className="flex max-h-80vh w-480px flex-col gap-24px overflow-y-auto bg-surface-neutral-surface-lv1 p-40px">
          {/* Info: (20250220 - Liz) Modal Title */}
          <section className="flex items-center justify-between">
            <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
              {t('team:INVITE_MEMBERS_MODAL.INVITE_MEMBERS')}
            </h1>
            <button type="button" onClick={closeInviteMembersModal}>
              <IoCloseOutline size={24} />
            </button>
          </section>

          <main className="flex flex-auto flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('team:INVITE_MEMBERS_MODAL.EMAIL')}
              <span className="text-text-state-error"> *</span>
            </h4>

            <div className="flex flex-col gap-1px">
              <div className="flex items-center overflow-hidden rounded-sm border border-input-stroke-input bg-surface-neutral-surface-lv1 shadow-Dropshadow_SM">
                <div className="px-12px py-10px">
                  <IoMailOutline size={16} />
                </div>

                <input
                  type="email"
                  value={inputEmail}
                  placeholder={t('team:INVITE_MEMBERS_MODAL.ENTER_EMAIL')}
                  onChange={updateInputEmail}
                  onKeyDown={addEmailToInvite}
                  className="flex-auto bg-transparent px-12px py-10px text-base font-medium outline-none"
                />
              </div>

              <p
                className={`text-right text-xs font-medium text-text-state-error ${isEmailNotValid ? 'visible' : 'invisible'}`}
              >
                {t('team:INVITE_MEMBERS_MODAL.PLEASE_ENTER_A_VALID_EMAIL_ADDRESS')}
              </p>
            </div>
          </main>

          {emailsToInvite.length > 0 && (
            <section className="flex flex-auto flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('team:INVITE_MEMBERS_MODAL.SEND_INVITATION_TO_THE_FOLLOWING_EMAIL_ADDRESS')}
              </h4>
              <ul className="flex flex-wrap items-center gap-4px">
                {emailsToInvite.map((email) => {
                  const removeEmailToInvite = () => {
                    setEmailsToInvite(emailsToInvite.filter((item) => item !== email));
                  };

                  return (
                    <li
                      key={email}
                      className="flex items-center gap-1px rounded-xs border border-badge-stroke-secondary p-6px text-badge-text-secondary"
                    >
                      <span className="px-4px text-xs font-medium leading-5">{email}</span>
                      <button type="button" onClick={removeEmailToInvite}>
                        <IoClose size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeInviteMembersModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('team:INVITE_MEMBERS_MODAL.CANCEL')}
            </button>
            <button
              type="button"
              onClick={inviteMembers}
              disabled={emailsToInvite.length === 0 || isLoading}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              {t('team:INVITE_MEMBERS_MODAL.INVITE')}
              <TbUserPlus size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default InviteMembersModal;
