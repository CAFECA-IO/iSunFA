import { Dispatch, SetStateAction, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import { TbUsersPlus } from 'react-icons/tb';
import { useTranslation } from 'next-i18next';
import { ITeam, ITeamMember } from '@/interfaces/team';
import { Button } from '@/components/button/button';
import MemberList from '@/components/beta/team_page/member_list';
import Pagination from '@/components/pagination/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import Skeleton from '@/components/skeleton/skeleton';
import InviteMembersModal from '@/components/beta/team_page/invite_members_modal';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import loggerFront from '@/lib/utils/logger_front';

interface MemberListModalProps {
  team: ITeam;
  setIsMemberListModalOpen: Dispatch<SetStateAction<boolean>>;
}

const MemberListModal = ({ team, setIsMemberListModalOpen }: MemberListModalProps) => {
  const { t } = useTranslation(['team']);
  const [isInviteMembersModalOpen, setIsInviteMembersModalOpen] = useState<boolean>(false);
  const [memberList, setMemberList] = useState<ITeamMember[] | null>(null);
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const invitePermission = convertTeamRoleCanDo({
    teamRole: team.role,
    canDo: TeamPermissionAction.INVITE_MEMBER,
  });

  const closeMemberListModal = () => {
    setIsMemberListModalOpen(false);
  };
  const openInviteMembersModal = () => {
    setIsInviteMembersModalOpen(true);
  };

  // Info: (20250304 - Liz) 取得成員清單 API (list member by team id)
  const { trigger: getMemberListByTeamIdAPI } = APIHandler<IPaginatedData<ITeamMember[]>>(
    APIName.LIST_MEMBER_BY_TEAM_ID
  );

  // Info: (20250304 - Liz) 打 API 取得成員清單
  const getMemberList = useCallback(async () => {
    if (!team) return;
    const teamIdString = team.id.toString();
    setIsLoading(true);

    try {
      const { data: memberListData, success } = await getMemberListByTeamIdAPI({
        params: { teamId: teamIdString },
        query: {
          page: currentPage,
          pageSize: 10,
        },
      });

      if (!success) throw new Error();
      if (success && memberListData) {
        setMemberList(memberListData.data);
        setTotalPage(memberListData.totalPages);
      }
    } catch (error) {
      (error as Error).message += ' (from getMemberList)';
      loggerFront.error('取得成員清單失敗');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, team]);

  useEffect(() => {
    getMemberList();
  }, [getMemberList]);

  // Info: (20250304 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  const modalBody = isLoading ? (
    <div className="flex flex-col items-center gap-16px">
      <Skeleton width={300} height={30} className="w-full" />
      <Skeleton width={300} height={30} className="flex-auto" />
      <Skeleton width={300} height={30} className="flex-auto" />
      <Skeleton width={300} height={30} className="flex-auto" />
    </div>
  ) : (
    <>
      {/* // Info: (20250220 - Liz) Total Member & Add Member Button */}
      <section className="flex items-center justify-between gap-20px">
        <p className="text-sm font-medium leading-5 text-text-neutral-mute">
          {team.name.value} - {team.totalMembers} {t('team:MEMBER_LIST_MODAL.MEMBERS')}
        </p>
        {invitePermission.can && (
          <Button
            variant="tertiary"
            size="small"
            onClick={openInviteMembersModal}
            className="text-sm font-medium leading-5"
          >
            <TbUsersPlus size={16} />
            <span>{t('team:MEMBER_LIST_MODAL.ADD_MEMBER')}</span>
          </Button>
        )}
      </section>

      {memberList && memberList.length > 0 && (
        <>
          <MemberList memberList={memberList} team={team} getMemberList={getMemberList} />
          <Pagination
            totalPages={totalPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}
    </>
  );

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col gap-lv-5 rounded-md bg-surface-neutral-surface-lv1 px-lv-4 py-lv-5 tablet:w-auto tablet:p-lv-7">
        {/* Info: (20250220 - Liz) Modal Title */}
        <header className="flex items-center justify-between">
          <h2 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('team:MEMBER_LIST_MODAL.MEMBER_LIST')}
          </h2>
          <button type="button" onClick={closeMemberListModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="max-h-65vh overflow-y-auto tablet:min-w-480px">
          <main className="flex flex-col gap-24px">
            {/* Info: (20250220 - Liz) Divider */}
            <div className="flex items-center gap-lv-4">
              <div className="flex items-center gap-lv-2">
                <Image src="/icons/member.svg" alt="member" width={16} height={14.29} />
                <span className="text-sm font-medium leading-5 text-divider-text-lv-1">
                  {t('team:MEMBER_LIST_MODAL.MEMBER_LIST')}
                </span>
              </div>
              <div className="h-1px flex-auto bg-divider-stroke-lv-4"></div>
            </div>

            {modalBody}
          </main>
        </div>
      </div>

      {/* Info: (20250324 - Liz) Modals */}
      {isInviteMembersModalOpen && invitePermission.can && (
        <InviteMembersModal
          team={team}
          setIsInviteMembersModalOpen={setIsInviteMembersModalOpen}
          getMemberList={getMemberList}
        />
      )}
    </main>
  );
};

export default MemberListModal;
