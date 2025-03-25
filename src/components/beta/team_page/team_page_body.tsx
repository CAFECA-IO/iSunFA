import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamImageModal from '@/components/beta/team_page/upload_team_image_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import TeamPageButtons from '@/components/beta/team_page/team_page_buttons';
import { useTranslation } from 'next-i18next';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { useUserCtx } from '@/contexts/user_context';
import NoData from '@/components/beta/account_books_page/no_data';
import AccountBookList from '@/components/beta/account_books_page/account_book_list';
import TransferAccountBookModal from '@/components/beta/account_books_page/transfer_account_book_modal';
import ChangeTagModal from '@/components/beta/account_books_page/change_tag_modal';
import UploadCompanyPictureModal from '@/components/beta/account_books_page/upload_company_picture_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import MemberListModal from '@/components/beta/team_page/member_list_modal';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { SkeletonList } from '@/components/skeleton/skeleton';

interface TeamPageBodyProps {
  team: ITeam;
  getTeamData: () => Promise<void>;
}

const TeamPageBody = ({ team, getTeamData }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);
  const { deleteAccountBook } = useUserCtx();
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[] | null>(null);
  const [teamToChangeImage, setTeamToChangeImage] = useState<ITeam | undefined>();
  const [accountBookToTransfer, setAccountBookToTransfer] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [accountBookToEdit, setAccountBookToEdit] = useState<IAccountBookWithTeam | undefined>();
  const [accountBookToDelete, setAccountBookToDelete] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [accountBookToUploadPicture, setAccountBookToUploadPicture] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [isMemberListModalOpen, setIsMemberListModalOpen] = useState<boolean>(false);
  const isNoData = !accountBookList || accountBookList.length === 0;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const closeDeleteModal = () => {
    setAccountBookToDelete(undefined);
  };

  const openMemberListModal = () => {
    setIsMemberListModalOpen(true);
  };

  // Info: (20250310 - Liz) 取得團隊帳本清單 API (list account book by team id)
  const { trigger: getAccountBookListByTeamIdAPI } = APIHandler<
    IPaginatedData<IAccountBookWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID);

  // Info: (20250310 - Liz) 打 API 取得團隊帳本清單
  const getAccountBookListByTeamId = useCallback(async () => {
    if (!team.id) return;
    setIsLoading(true);
    try {
      const { data: accountBookListData, success } = await getAccountBookListByTeamIdAPI({
        params: { teamId: team.id },
      });

      if (!success || !accountBookListData) {
        // Deprecated: (20250219 - Liz)
        // eslint-disable-next-line no-console
        console.log('取得團隊帳本清單失敗');
        return;
      }

      setAccountBookList(accountBookListData.data);
    } catch (error) {
      // Deprecated: (20250219 - Liz)
      // eslint-disable-next-line no-console
      console.log('取得團隊帳本清單失敗');
    } finally {
      setIsLoading(false);
    }
  }, [team.id]);

  // Info: (20250219 - Liz) 打 API 刪除帳本(原為公司)
  const handleDeleteAccountBook = async () => {
    if (!accountBookToDelete) return;

    try {
      const data = await deleteAccountBook(accountBookToDelete.id);

      if (!data) {
        // Deprecated: (20250219 - Liz)
        // eslint-disable-next-line no-console
        console.log('刪除帳本失敗');
        return;
      }

      getAccountBookListByTeamId(); // Info: (20250314 - Liz) 重新取得團隊帳本清單
      closeDeleteModal();
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

  useEffect(() => {
    getAccountBookListByTeamId();
  }, [getAccountBookListByTeamId]);

  // Info: (20250310 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) return <SkeletonList count={6} />;

  return (
    <main className="flex flex-col gap-40px">
      <div className="flex items-center">
        <TeamHeader team={team} setTeamToChangeImage={setTeamToChangeImage} />
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

      {/* Info: (20250218 - Liz) Modals */}
      {teamToChangeImage && (
        <UploadTeamImageModal
          teamToChangeImage={teamToChangeImage}
          setTeamToChangeImage={setTeamToChangeImage}
          getTeamData={getTeamData}
        />
      )}

      {accountBookToTransfer && (
        <TransferAccountBookModal
          accountBookToTransfer={accountBookToTransfer}
          setAccountBookToTransfer={setAccountBookToTransfer}
          getAccountBookListByTeamId={getAccountBookListByTeamId}
        />
      )}

      {accountBookToEdit && (
        <ChangeTagModal
          accountBookToEdit={accountBookToEdit}
          setAccountBookToEdit={setAccountBookToEdit}
        />
      )}

      {accountBookToUploadPicture && (
        <UploadCompanyPictureModal
          accountBookToUploadPicture={accountBookToUploadPicture}
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
        <MemberListModal team={team} setIsMemberListModalOpen={setIsMemberListModalOpen} />
      )}
    </main>
  );
};

export default TeamPageBody;
