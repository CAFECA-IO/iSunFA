import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import Pagination from '@/components/pagination/pagination';
import { TbSquarePlus2, TbCodeCircle } from 'react-icons/tb';

import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import ChangeTagModal from '@/components/beta/my_company_list_page/change_tag_modal';
import FilterSection from '@/components/filter_section/filter_section';
import CompanyItem from '@/components/beta/my_company_list_page/company_item';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICompanyAndRole } from '@/interfaces/company';
import { useTranslation } from 'react-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_COMPANY_LIST } from '@/constants/config';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';

interface CompanyListProps {
  companyList: ICompanyAndRole[];
  toggleDeleteModal: () => void;
  setCompanyToEdit: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setCompanyToDelete: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const NoData = () => {
  const { t } = useTranslation(['company']);

  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>{t('company:PAGE_BODY.NO_COMPANY_DATA_AVAILABLE')}</p>
        <p>{t('company:PAGE_BODY.PLEASE_ADD_A_NEW_COMPANY')}</p>
      </div>
    </section>
  );
};

const CompanyList = ({
  companyList,
  toggleDeleteModal,
  setCompanyToEdit,
  setCompanyToDelete,
}: CompanyListProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      {companyList.map((myCompany) => (
        <CompanyItem
          key={myCompany.company.id}
          myCompany={myCompany}
          toggleDeleteModal={toggleDeleteModal}
          setCompanyToEdit={setCompanyToEdit}
          setCompanyToDelete={setCompanyToDelete}
        />
      ))}
    </section>
  );
};

const MyCompanyListPageBody = () => {
  const { t } = useTranslation(['company']);
  const { userAuth } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<ICompanyAndRole | undefined>();
  const [companyToDelete, setCompanyToDelete] = useState<ICompanyAndRole | undefined>();
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyList, setCompanyList] = useState<ICompanyAndRole[]>([]);

  const isNoData = companyList.length === 0;

  const toggleCreateCompanyModal = () => {
    setIsCreateCompanyModalOpen((prev) => !prev);
  };
  const toggleDeleteModal = () => {
    setIsDeleteModalOpen((prev) => !prev);
  };

  const messageModalData: IMessageModal = {
    title: 'Delete the Company',
    content: 'Are you sure you want to Delete the Company?',
    submitBtnStr: 'Delete',
    submitBtnFunction: () => {}, // ToDo: (20241114 - Liz) call Delete Company API
    messageType: MessageType.WARNING,
    backBtnFunction: toggleDeleteModal,
    backBtnStr: 'Cancel',
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
            <TbSquarePlus2 size={20} />
            <p>{t('company:PAGE_BODY.ADD_NEW')}</p>
          </button>

          <button
            type="button"
            className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <TbCodeCircle size={20} />
            <p>{t('company:PAGE_BODY.CODE')}</p>
          </button>
        </div>
      </section>

      {isNoData && <NoData />}
      {!isNoData && (
        <>
          <CompanyList
            companyList={companyList}
            toggleDeleteModal={toggleDeleteModal}
            setCompanyToEdit={setCompanyToEdit}
            setCompanyToDelete={setCompanyToDelete}
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
        isModalOpen={isCreateCompanyModalOpen}
        toggleModal={toggleCreateCompanyModal}
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

      {companyToDelete && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={isDeleteModalOpen}
          modalVisibilityHandler={toggleDeleteModal}
        />
      )}
    </main>
  );
};

export default MyCompanyListPageBody;
