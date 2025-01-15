import { useState } from 'react';
import { BsEnvelope, BsPlusLg } from 'react-icons/bs';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICompanyAndRole } from '@/interfaces/company';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_COMPANY_LIST } from '@/constants/config';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import Pagination from '@/components/pagination/pagination';
import MessageModal from '@/components/message_modal/message_modal';
import FilterSection from '@/components/filter_section/filter_section';
import NoData from '@/components/beta/my_company_list_page/no_data';
import UploadCompanyAvatarModal from '@/components/beta/my_company_list_page/upload_company_avatar_modal';
import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import ChangeTagModal from '@/components/beta/my_company_list_page/change_tag_modal';
import CompanyList from '@/components/beta/my_company_list_page/company_list';

const MyCompanyListPageBody = () => {
  const { t } = useTranslation(['company']);
  const { userAuth, deleteCompany } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<ICompanyAndRole | undefined>();
  const [companyToDelete, setCompanyToDelete] = useState<ICompanyAndRole | undefined>();
  const [companyToUploadAvatar, setCompanyToUploadAvatar] = useState<ICompanyAndRole | undefined>();
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyList, setCompanyList] = useState<ICompanyAndRole[]>([]);

  const isNoData = companyList.length === 0;

  const toggleCreateCompanyModal = () => {
    setIsCreateCompanyModalOpen((prev) => !prev);
  };

  const closeDeleteModal = () => {
    setCompanyToDelete(undefined);
  };

  // Info: (20241115 - Liz) 打 API 刪除公司
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      const data = await deleteCompany(companyToDelete.company.id);

      if (data) {
        setRefreshKey((prev) => prev + 1);
      } else {
        // Deprecated: (20241115 - Liz)
        // eslint-disable-next-line no-console
        console.log('刪除公司失敗');
      }
    } catch (error) {
      // Deprecated: (20241115 - Liz)
      // eslint-disable-next-line no-console
      console.error('MyCompanyListPageBody handleDeleteCompany error:', error);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('company:PAGE_BODY.DELETE_MESSAGE_TITLE'),
    content: t('company:PAGE_BODY.DELETE_MESSAGE_CONTENT'),
    submitBtnStr: t('company:PAGE_BODY.DELETE'),
    submitBtnFunction: handleDeleteCompany,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('company:PAGE_BODY.CANCEL'),
  };

  const handleApiResponse = (resData: IPaginatedData<ICompanyAndRole[]>) => {
    setCompanyList(resData.data);
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        {userId && (
          <FilterSection<ICompanyAndRole[]>
            key={refreshKey}
            disableDateSearch
            className="flex-auto"
            params={{ userId }}
            apiName={APIName.LIST_USER_COMPANY}
            onApiResponse={handleApiResponse}
            page={currentPage}
            pageSize={DEFAULT_PAGE_LIMIT_FOR_COMPANY_LIST}
          />
        )}

        <div className="flex items-center gap-16px">
          <button
            type="button"
            onClick={toggleCreateCompanyModal}
            className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-24px py-10px text-base font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <BsPlusLg size={20} />
            <p>{t('company:PAGE_BODY.ADD_NEW')}</p>
          </button>

          <button
            type="button"
            className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <BsEnvelope size={20} />
            <p>{t('company:PAGE_BODY.INVITE_CODE')}</p>
          </button>
        </div>
      </section>

      {isNoData && <NoData />}
      {!isNoData && (
        <>
          <CompanyList
            companyList={companyList}
            setCompanyToEdit={setCompanyToEdit}
            setCompanyToDelete={setCompanyToDelete}
            setCompanyToUploadAvatar={setCompanyToUploadAvatar}
          />
          <Pagination
            totalPages={totalPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}

      {/* // Info: (20241108 - Liz) Modals */}
      <CreateCompanyModal
        isModalVisible={isCreateCompanyModalOpen}
        modalVisibilityHandler={toggleCreateCompanyModal}
        setRefreshKey={setRefreshKey}
      />

      {companyToEdit && (
        <ChangeTagModal
          companyToEdit={companyToEdit}
          isModalOpen={!!companyToEdit}
          setCompanyToEdit={setCompanyToEdit}
          setRefreshKey={setRefreshKey}
        />
      )}

      {companyToUploadAvatar && (
        <UploadCompanyAvatarModal
          companyToUploadAvatar={companyToUploadAvatar}
          isModalOpen={!!companyToUploadAvatar}
          setCompanyToUploadAvatar={setCompanyToUploadAvatar}
          setRefreshKey={setRefreshKey}
        />
      )}

      {companyToDelete && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={!!companyToDelete}
          modalVisibilityHandler={closeDeleteModal}
        />
      )}
    </main>
  );
};

export default MyCompanyListPageBody;
