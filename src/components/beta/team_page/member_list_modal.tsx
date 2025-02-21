import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import { TbUsersPlus } from 'react-icons/tb';
import { useTranslation } from 'next-i18next';
import { ITeam, ITeamMember } from '@/interfaces/team';
import { FAKE_TEAM_MEMBER_LIST } from '@/constants/team';
import { Button } from '@/components/button/button';
import MemberList from '@/components/beta/team_page/member_list';
import Pagination from '@/components/pagination/pagination';
// import APIHandler from '@/lib/utils/api_handler'; // ToDo: (20250220 - Liz)
// import { APIName } from '@/constants/api_connection'; // ToDo: (20250220 - Liz)
// import { IPaginatedData } from '@/interfaces/pagination'; // ToDo: (20250220 - Liz)

interface MemberListModalProps {
  team: ITeam;
  setIsMemberListModalOpen: Dispatch<SetStateAction<boolean>>;
}

const MemberListModal = ({ team, setIsMemberListModalOpen }: MemberListModalProps) => {
  const { t } = useTranslation(['team']);
  const [memberList, setMemberList] = useState<ITeamMember[] | null>(null);
  // ToDo: (20250220 - Liz) 從 api 回傳的成員清單會有總頁數
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const closeMemberListModal = () => {
    setIsMemberListModalOpen(false);
  };

  // ToDo: (20250220 - Liz) 取得成員清單 API (list member by team id)
  // const { trigger: getMemberListByTeamIdAPI } = APIHandler<IPaginatedData<ITeamMember[]>>(APIName.?);

  // ToDo: (20250220 - Liz) 打 api 取得成員清單

  // Deprecated: (20250220 - Liz) 目前後端尚未提供 API，先用假資料測試
  useEffect(() => {
    setMemberList(FAKE_TEAM_MEMBER_LIST);
  }, []);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md">
        <div className="flex max-h-80vh min-w-480px flex-col gap-24px overflow-y-auto bg-surface-neutral-surface-lv1 p-40px">
          {/* Info: (20250220 - Liz) Modal Title */}
          <section className="flex items-center justify-between">
            <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
              {t('team:MEMBER_LIST_MODAL.MEMBER_LIST')}
            </h1>
            <button type="button" onClick={closeMemberListModal}>
              <IoCloseOutline size={24} />
            </button>
          </section>

          {/* // Info: (20250220 - Liz) Divider */}
          <div className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/member.svg" alt="member" width={16} height={14.29}></Image>
              <span className="text-sm font-medium leading-5 text-divider-text-lv-1">
                {t('team:MEMBER_LIST_MODAL.MEMBER_LIST')}
              </span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </div>

          {/* // Info: (20250220 - Liz) Total Member & Add Member Button */}
          <section className="flex items-center justify-between">
            <p className="text-sm font-medium leading-5 text-text-neutral-mute">
              {team.name.value} - {team.totalMembers} {t('team:MEMBER_LIST_MODAL.MEMBERS')}
            </p>
            <Button variant="tertiary" size="small" className="text-sm font-medium leading-5">
              <TbUsersPlus size={16} />
              <span>{t('team:MEMBER_LIST_MODAL.ADD_MEMBER')}</span>
            </Button>
          </section>

          {memberList && memberList.length > 0 && (
            <>
              <MemberList memberList={memberList} />
              <Pagination
                totalPages={totalPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default MemberListModal;
