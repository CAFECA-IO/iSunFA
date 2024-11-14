import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import Pagination from '@/components/pagination/pagination';
import { TbSquarePlus2, TbCodeCircle } from 'react-icons/tb';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoArrowForward } from 'react-icons/io5';
import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import ChangeTagModal from '@/components/beta/my_company_list_page/change_tag_modal';
import CompanyTag from '@/components/beta/my_company_list_page/company_tag';
import FilterSection from '@/components/filter_section/filter_section';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { useTranslation } from 'react-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_COMPANY_LIST } from '@/constants/config';
import { CANCEL_COMPANY_ID } from '@/constants/company';

interface CompanyListProps {
  companyList: ICompanyAndRole[];
  toggleChangeTagModal: () => void;
  setCompanyToEdit: Dispatch<SetStateAction<ICompany | null>>;
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

const CompanyList = ({ companyList, toggleChangeTagModal, setCompanyToEdit }: CompanyListProps) => {
  const { t } = useTranslation(['company']);
  const { selectCompany, selectedCompany } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);

  const openChangeTagModal = (company: ICompany) => {
    setCompanyToEdit(company);
    toggleChangeTagModal();
  };

  return (
    <section className="flex flex-auto flex-col gap-8px">
      {companyList.map((myCompany) => {
        const isCompanySelected = myCompany.company.id === selectedCompany?.id;

        // Info: (20241113 - Liz) call Select Company API
        const handleConnect = async () => {
          if (isLoading) return;

          setIsLoading(true);

          const companyId = isCompanySelected ? CANCEL_COMPANY_ID : myCompany.company.id;

          // Deprecated: (20241113 - Liz)
          // eslint-disable-next-line no-console
          console.log(
            '這個公司原本是否已經被選擇 isCompanySelected:',
            isCompanySelected,
            '這個按鈕是 myCompany.company.id:',
            myCompany.company.id,
            'user context 目前存的狀態 selectedCompany?.id:',
            selectedCompany?.id,
            '按下去會傳給選擇公司 api 的 companyId:',
            companyId
          );

          try {
            const data = selectCompany(companyId);

            // Deprecated: (20241113 - Liz)
            // eslint-disable-next-line no-console
            console.log('執行 selectCompany api 回傳:', data);

            // ToDo: (20241114 - Liz) 選擇公司成功後的相關處理
          } catch (error) {
            // Deprecated: (20241113 - Liz)
            // eslint-disable-next-line no-console
            console.log('CompanyList handleConnect error:', error);
          } finally {
            setIsLoading(false);
          }
        };

        return (
          <div
            key={myCompany.company.id}
            className="flex items-center justify-between gap-120px rounded-xxs bg-surface-neutral-surface-lv2 px-24px py-8px shadow-Dropshadow_XS"
          >
            <Image
              src={myCompany.company.imageId}
              alt={myCompany.company.name}
              width={60}
              height={60}
              className="flex-none rounded-sm bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS"
            ></Image>

            <div className="flex flex-auto items-center gap-8px">
              <p className="text-base font-medium text-text-neutral-solid-dark">
                {myCompany.company.name}
              </p>
              <BsThreeDotsVertical size={16} className="text-icon-surface-single-color-primary" />
            </div>

            <div className="flex w-90px justify-center">
              <CompanyTag
                tag={myCompany.tag}
                onClinkCompanyTag={() => openChangeTagModal(myCompany.company)}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-4px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-16px py-8px text-button-text-primary-solid hover:bg-button-surface-soft-primary-hover"
              onClick={handleConnect}
              disabled={isLoading}
            >
              <p className="text-sm font-medium">
                {isCompanySelected ? t('company:PAGE_BODY.CANCEL') : t('company:PAGE_BODY.CONNECT')}
              </p>
              <IoArrowForward size={16} />
            </button>
          </div>
        );
      })}
    </section>
  );
};

const MyCompanyListPageBody = () => {
  const { t } = useTranslation(['company']);
  const { userAuth } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isChangeTagModalOpen, setIsChangeTagModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<ICompany | null>(null);
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyList, setCompanyList] = useState<ICompanyAndRole[]>([]);

  const isNoData = companyList.length === 0;

  const toggleChangeTagModal = () => {
    setIsChangeTagModalOpen((prev) => !prev);
  };
  const toggleCreateCompanyModal = () => {
    setIsCreateCompanyModalOpen((prev) => !prev);
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
            toggleChangeTagModal={toggleChangeTagModal}
            setCompanyToEdit={setCompanyToEdit}
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

      <ChangeTagModal
        companyToEdit={companyToEdit}
        isModalOpen={isChangeTagModalOpen}
        toggleModal={toggleChangeTagModal}
        setRefreshKey={setRefreshKey}
      />
    </main>
  );
};

export default MyCompanyListPageBody;
