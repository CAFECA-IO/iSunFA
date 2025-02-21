import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamPictureModal from '@/components/beta/team_page/upload_team_picture_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import TeamPageButtons from '@/components/beta/team_page/team_page_buttons';
import { useTranslation } from 'next-i18next';
import { ICompanyAndRole } from '@/interfaces/company';
import { useUserCtx } from '@/contexts/user_context';
import NoData from '@/components/beta/account_books_page/no_data';
import AccountBookList from '@/components/beta/account_books_page/account_book_list';
import TransferAccountBookModal from '@/components/beta/account_books_page/transfer_account_book_modal';
import ChangeTagModal from '@/components/beta/account_books_page/change_tag_modal';
import UploadCompanyPictureModal from '@/components/beta/account_books_page/upload_company_picture_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { FAKE_COMPANY_AND_ROLE_LIST } from '@/constants/account_book';
import MemberListModal from '@/components/beta/team_page/member_list_modal';
import InviteMembersModal from '@/components/beta/team_page/invite_members_modal';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamPageBody = ({ team }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);
  const { deleteAccountBook } = useUserCtx();
  const [accountBookList, setAccountBookList] = useState<ICompanyAndRole[] | null>(null);
  const [teamToUploadPicture, setTeamToUploadPicture] = useState<ITeam | undefined>();
  const [accountBookToTransfer, setAccountBookToTransfer] = useState<ICompanyAndRole | undefined>();
  const [accountBookToEdit, setAccountBookToEdit] = useState<ICompanyAndRole | undefined>();
  const [accountBookToDelete, setAccountBookToDelete] = useState<ICompanyAndRole | undefined>();
  const [accountBookToUploadPicture, setAccountBookToUploadPicture] = useState<
    ICompanyAndRole | undefined
  >();
  const [isMemberListModalOpen, setIsMemberListModalOpen] = useState<boolean>(false);
  const [isInviteMembersModalOpen, setIsInviteMembersModalOpen] = useState<boolean>(false);
  const isNoData = !accountBookList || accountBookList.length === 0;

  const closeDeleteModal = () => {
    setAccountBookToDelete(undefined);
  };

  const openMemberListModal = () => {
    setIsMemberListModalOpen(true);
  };

  const openInviteMembersModal = () => {
    setIsInviteMembersModalOpen(true);
  };

  // ToDo: (20250219 - Liz) 取得團隊帳本清單 API (list account book by team id)
  // const { trigger: getAccountBookListByTeamIdAPI } = APIHandler<IPaginatedData<ICompanyAndRole[]>(APIName.?);

  // ToDo: (20250219 - Liz) 打 API 取得團隊帳本清單
  // const getAccountBookListByTeamId = useCallback(async () => {
  //   if (!team.id) return;
  //   setIsLoading(true);
  //   try {
  //     const { data: accountBookListData, success } = await getAccountBookListByTeamIdAPI({
  //       params: { teamId: team.id },
  //     });
  //     if (success && accountBookListData) {
  //       setAccountBookList(accountBookListData);
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
    setAccountBookList(FAKE_COMPANY_AND_ROLE_LIST);
  }, []);

  return (
    <main className="flex flex-col gap-40px">
      <div className="flex items-center">
        <TeamHeader team={team} setTeamToUploadPicture={setTeamToUploadPicture} />
        <TeamPageButtons team={team} openMemberListModal={openMemberListModal} />
      </div>

      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src="/icons/open_book.svg" alt="open_book" width={16} height={15.235}></Image>
          <span>{t('team:TEAM_PAGE.LIBRARY')}</span>
        </div>
        <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
      </div>

      {isNoData && <NoData />}
      {!isNoData && (
        <AccountBookList
          accountBookList={accountBookList}
          setAccountBookToTransfer={setAccountBookToTransfer}
          setAccountBookToEdit={setAccountBookToEdit}
          setAccountBookToDelete={setAccountBookToDelete}
          setAccountBookToUploadPicture={setAccountBookToUploadPicture}
        />
      )}

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

      {accountBookToEdit && (
        <ChangeTagModal
          accountBookToEdit={accountBookToEdit}
          isModalOpen={!!accountBookToEdit}
          setAccountBookToEdit={setAccountBookToEdit}
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

export default TeamPageBody;
