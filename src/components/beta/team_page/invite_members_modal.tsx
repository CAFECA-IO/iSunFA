import { useState, Dispatch, SetStateAction } from 'react';
import { IoCloseOutline, IoMailOutline, IoClose, IoAdd } from 'react-icons/io5';
import { TbUserPlus } from 'react-icons/tb';
import { useTranslation } from 'next-i18next';
import { ITeam, IInviteMemberResponse } from '@/interfaces/team';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import loggerFront from '@/lib/utils/logger_front';

interface InviteMembersModalProps {
  team: ITeam;
  setIsInviteMembersModalOpen: Dispatch<SetStateAction<boolean>>;
  getMemberList: () => Promise<void>;
}

const InviteMembersModal = ({
  team,
  setIsInviteMembersModalOpen,
  getMemberList,
}: InviteMembersModalProps) => {
  const { t } = useTranslation(['team']);
  const [inputEmail, setInputEmail] = useState<string>('');
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([]);
  const [isEmailNotValid, setIsEmailNotValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20250306 - Liz) 邀請成員 API (add member to team)
  const { trigger: addMemberToTeamAPI } = APIHandler<IInviteMemberResponse>(
    APIName.INVITE_MEMBER_TO_TEAM
  );

  const closeInviteMembersModal = () => {
    setIsInviteMembersModalOpen(false);
  };

  const updateInputEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(e.target.value);
    setIsEmailNotValid(false);
  };

  // Info: (20250318 - Liz) 新增 email 到邀請清單 (兼容 Enter 鍵與按鈕點擊)
  const addEmailToInvite = (
    e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    const isEnterKey = 'key' in e && e.key === KEYBOARD_EVENT_CODE.ENTER;
    const isClick = e.type === 'click';

    if (!isEnterKey && !isClick) return;

    const trimmedEmail = inputEmail.trim();
    if (!trimmedEmail) return;

    // Info: (20250221 - Liz) 簡單的 email 格式驗證
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setIsEmailNotValid(true);
      return;
    }

    if (emailsToInvite.includes(trimmedEmail)) return;

    setEmailsToInvite([...emailsToInvite, trimmedEmail]);
    setInputEmail('');
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

      setEmailsToInvite([]);
      closeInviteMembersModal();
      getMemberList();

      loggerFront.log('邀請成員成功');
    } catch (error) {
      (error as Error).message += ' (from inviteMembers)';
      loggerFront.error('邀請成員失敗');
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

            <section className="flex flex-col gap-2px">
              <div className="flex items-center overflow-hidden rounded-sm border border-input-stroke-input bg-surface-neutral-surface-lv1 shadow-Dropshadow_SM">
                <div className="px-12px py-10px">
                  <IoMailOutline size={16} />
                </div>

                <div className="flex flex-auto flex-wrap items-center justify-start gap-4px px-4px py-8px">
                  {emailsToInvite.map((email) => {
                    const removeEmailToInvite = () => {
                      setEmailsToInvite(emailsToInvite.filter((item) => item !== email));
                    };

                    return (
                      <div
                        key={email}
                        className="flex items-center gap-1px rounded-xs border border-badge-stroke-secondary p-6px text-badge-text-secondary"
                      >
                        <span className="px-4px text-xs font-medium leading-5">{email}</span>
                        <button type="button" onClick={removeEmailToInvite}>
                          <IoClose size={14} />
                        </button>
                      </div>
                    );
                  })}

                  <input
                    type="email"
                    value={inputEmail}
                    placeholder={
                      emailsToInvite.length > 0 ? '' : t('team:INVITE_MEMBERS_MODAL.ENTER_EMAIL')
                    }
                    onChange={updateInputEmail}
                    onKeyDown={addEmailToInvite}
                    className="flex-auto bg-transparent text-base font-medium outline-none"
                  />
                </div>

                <button type="button" className="px-12px py-10px" onClick={addEmailToInvite}>
                  <IoAdd size={16} />
                </button>
              </div>

              <p
                className={`text-right text-xs font-medium text-text-state-error ${isEmailNotValid ? 'visible' : 'invisible'}`}
              >
                {t('team:INVITE_MEMBERS_MODAL.PLEASE_ENTER_A_VALID_EMAIL_ADDRESS')}
              </p>
            </section>
          </main>

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
