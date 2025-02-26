import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamPictureModal from '@/components/beta/team_page/upload_team_picture_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import { useTranslation } from 'next-i18next';
import { IAccountBookForUser } from '@/interfaces/company';
import { useUserCtx } from '@/contexts/user_context';
import NoData from '@/components/beta/account_books_page/no_data';
import TeamInformation from '@/components/beta/team_information_page/teamInformation';
import TransferAccountBookModal from '@/components/beta/account_books_page/transfer_account_book_modal';
import UploadCompanyPictureModal from '@/components/beta/account_books_page/upload_company_picture_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { FAKE_TEAM_LIST } from '@/constants/team';
import MemberListModal from '@/components/beta/team_page/member_list_modal';
import InviteMembersModal from '@/components/beta/team_page/invite_members_modal';
import { useRouter } from 'next/router';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamInformationPageBody = ({ team }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);
  const router = useRouter();
  const { teamId } = router.query; // Info:(20250224 - Anna) 取得網址的 teamId
  const { deleteAccountBook } = useUserCtx();
  const [teamInfo, setTeamInfo] = useState<ITeam | undefined>();
  const [teamToUploadPicture, setTeamToUploadPicture] = useState<ITeam | undefined>();
  const [accountBookToTransfer, setAccountBookToTransfer] = useState<
    IAccountBookForUser | undefined
  >();
  const [accountBookToDelete, setAccountBookToDelete] = useState<IAccountBookForUser | undefined>();
  const [accountBookToUploadPicture, setAccountBookToUploadPicture] = useState<
    IAccountBookForUser | undefined
  >();
  const [isMemberListModalOpen, setIsMemberListModalOpen] = useState<boolean>(false);
  const [isInviteMembersModalOpen, setIsInviteMembersModalOpen] = useState<boolean>(false);
  const isNoData = !teamInfo;

  const closeDeleteModal = () => {
    setAccountBookToDelete(undefined);
  };

  const openInviteMembersModal = () => {
    setIsInviteMembersModalOpen(true);
  };

  // ToDo: (20250219 - Liz) 取得團隊帳本清單 API (list account book by team id)
  // const { trigger: getTeamInfoByTeamIdAPI } = APIHandler<IPaginatedData<IAccountBookForUser[]>(APIName.?);

  // ToDo: (20250219 - Liz) 打 API 取得團隊帳本清單
  // const getTeamInfoByTeamId = useCallback(async () => {
  //   if (!team.id) return;
  //   setIsLoading(true);
  //   try {
  //     const { data: teamInfoData, success } = await getTeamInfoByTeamIdAPI({
  //       params: { teamId: team.id },
  //     });
  //     if (success && teamInfoData) {
  //       setTeamInfo(teamInfoData);
  //     }
  //   } catch (error) {
  //     // Deprecated: (20250219 - Liz)
  //     // eslint-disable-next-line no-console
  //     console.log('取得團隊帳本清單失敗');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [team.id]);

  // Info: (20250219 - Liz) 打 API 刪除帳本(原為公司)
  const handleDeleteAccountBook = async () => {
    if (!accountBookToDelete) return;

    try {
      const data = await deleteAccountBook(accountBookToDelete.company.id);

      if (data) {
        // setRefreshKey((prev) => prev + 1); // ToDo: (20250219 - Liz) 重新取得團隊帳本清單
      } else {
        // Deprecated: (20250219 - Liz)
        // eslint-disable-next-line no-console
        console.log('刪除帳本失敗');
      }
    } catch (error) {
      // Deprecated: (20250219 - Liz)
      // eslint-disable-next-line no-console
      console.error('AccountBooksPageBody handleDeleteAccountBook error:', error);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_TITLE'),
    content: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_CONTENT'),
    submitBtnStr: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE'),
    submitBtnFunction: handleDeleteAccountBook,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL'),
  };

  // Deprecated: (20250219 - Liz) 目前後端尚未提供 API，先用假資料測試
  useEffect(() => {
    if (!teamId) return; // Info:(20250224 - Anna) 確保 teamId 存在
    // setTeamInfo(FAKE_TEAM_LIST);
    const foundTeam = FAKE_TEAM_LIST.find((target) => target.id === teamId); // Info:(20250224 - Anna) 只取符合 teamId 的團隊
    setTeamInfo(foundTeam);
  }, [teamId]);

  return (
    <main className="flex flex-col gap-40px">
      <div className="flex items-center">
        <TeamHeader team={team} setTeamToUploadPicture={setTeamToUploadPicture} />
      </div>

      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src="/icons/open_book.svg" alt="open_book" width={16} height={15.235}></Image>
          <span>{t('team:TEAM_PAGE.LIBRARY')}</span>
        </div>
        <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
      </div>

      {isNoData && <NoData />}
      {!isNoData && <TeamInformation teamInfo={teamInfo} />}

      {/* // Info: (20250218 - Liz) Modals */}
      {teamToUploadPicture && (
        <UploadTeamPictureModal
          teamToUploadPicture={teamToUploadPicture}
          setTeamToUploadPicture={setTeamToUploadPicture}
        />
      )}

      {accountBookToTransfer && (
        <TransferAccountBookModal
          accountBookToTransfer={accountBookToTransfer}
          setAccountBookToTransfer={setAccountBookToTransfer}
        />
      )}

      {accountBookToUploadPicture && (
        <UploadCompanyPictureModal
          accountBookToUploadPicture={accountBookToUploadPicture}
          isModalOpen={!!accountBookToUploadPicture}
          setAccountBookToUploadPicture={setAccountBookToUploadPicture}
        />
      )}

      {accountBookToDelete && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={!!accountBookToDelete}
          modalVisibilityHandler={closeDeleteModal}
        />
      )}

      {isMemberListModalOpen && (
        <MemberListModal
          team={team}
          setIsMemberListModalOpen={setIsMemberListModalOpen}
          openInviteMembersModal={openInviteMembersModal}
        />
      )}

      {isInviteMembersModalOpen && (
        <InviteMembersModal setIsInviteMembersModalOpen={setIsInviteMembersModalOpen} />
      )}
    </main>
  );
};

export default TeamInformationPageBody;
