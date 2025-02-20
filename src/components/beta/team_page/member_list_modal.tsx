import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import { TbUsersPlus } from 'react-icons/tb';
import { ITeam, ITeamMember } from '@/interfaces/team';
import { FAKE_TEAM_MEMBER_LIST } from '@/constants/team';
import { Button } from '@/components/button/button';
import MemberList from '@/components/beta/team_page/member_list';

interface MemberListModalProps {
  team: ITeam;
  setIsMemberListModalOpen: Dispatch<SetStateAction<boolean>>;
}

const MemberListModal = ({ team, setIsMemberListModalOpen }: MemberListModalProps) => {
  const [memberList, setMemberList] = useState<ITeamMember[] | null>(null);

  const closeMemberListModal = () => {
    setIsMemberListModalOpen(false);
  };

  // ToDo: (20250220 - Liz) 打 api 取得成員清單 (list member by team id)

  // Deprecated: (20250220 - Liz) 目前後端尚未提供 API，先用假資料測試
  useEffect(() => {
    setMemberList(FAKE_TEAM_MEMBER_LIST);
  }, []);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md">
        <div className="flex max-h-80vh min-w-480px flex-col gap-24px overflow-y-auto bg-surface-neutral-surface-lv1 p-40px">
          <section className="flex items-center justify-between">
            <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
              Member List
            </h1>
            <button type="button" onClick={closeMemberListModal}>
              <IoCloseOutline size={24} />
            </button>
          </section>

          <div className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/member.svg" alt="member" width={16} height={14.29}></Image>
              <span className="text-sm font-medium leading-5 text-divider-text-lv-1">
                Member List
              </span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </div>

          <section className="flex items-center justify-between">
            <p className="text-sm font-medium leading-5 text-text-neutral-mute">
              {team.name.value} - {team.totalMembers} members
            </p>
            <Button variant="tertiary" size="small" className="text-sm font-medium leading-5">
              <TbUsersPlus size={16} />
              <span>Add Member</span>
            </Button>
          </section>

          {memberList && memberList.length > 0 && <MemberList memberList={memberList} />}
        </div>
      </div>
    </main>
  );
};

export default MemberListModal;
