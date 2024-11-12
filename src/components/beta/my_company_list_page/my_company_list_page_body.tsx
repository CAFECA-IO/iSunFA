import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import Pagination from '@/components/pagination/pagination';
import { TbSquarePlus2, TbCodeCircle } from 'react-icons/tb';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoArrowForward } from 'react-icons/io5';
import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import ChangeTagModal from '@/components/beta/my_company_list_page/change_tag_modal';
import WorkTag from '@/components/beta/my_company_list_page/company_tag';
import FilterSection from '@/components/filter_section/filter_section';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICompanyAndRole } from '@/interfaces/company';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_COMPANY_LIST } from '@/constants/config';
import { CANCEL_COMPANY_ID } from '@/constants/company';

interface CompanyListProps {
  companyList: ICompanyAndRole[];
  toggleChangeTagModal: () => void;
  setCompanyName: Dispatch<SetStateAction<string>>;
}

const NoData = () => {
  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>No company data available.</p>
        <p>Please add a new company.</p>
      </div>
    </section>
  );
};

const CompanyList = ({ companyList, toggleChangeTagModal, setCompanyName }: CompanyListProps) => {
  const { selectCompany, selectedCompany } = useUserCtx();

  // ToDo: (20241111 - Liz) connect to the API to change the tag
  const handleChangeTag = (companyName: string) => {
    setCompanyName(companyName);
    toggleChangeTagModal();
  };

  return (
    <section className="flex flex-auto flex-col gap-8px">
      {companyList.map((myCompany) => {
        const isCompanySelected = myCompany.company.id === selectedCompany?.id;
        const companyId = isCompanySelected ? CANCEL_COMPANY_ID : myCompany.company.id;

        const handleConnect = () => {
          selectCompany(companyId);
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
              <WorkTag
                type={myCompany.tag}
                handleChangeTag={() => handleChangeTag(myCompany.company.name)}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-4px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-16px py-8px text-button-text-primary-solid hover:bg-button-surface-soft-primary-hover"
              onClick={handleConnect}
            >
              <p className="text-sm font-medium">{isCompanySelected ? ' Cancel' : 'Connect'}</p>
              <IoArrowForward size={16} />
            </button>
          </div>
        );
      })}
    </section>
  );
};

const MyCompanyListPageBody = () => {
  const { userAuth } = useUserCtx();
  // Deprecated: (20241111 - Liz)
  // eslint-disable-next-line no-console
  console.log('(in MyCompanyListPageBody) userAuth:', userAuth);

  const userId = userAuth?.id;

  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isCallingAPI, setIsCallingAPI] = useState(false);

  const [isChangeTagModalOpen, setIsChangeTagModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');

  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyList, setCompanyList] = useState<ICompanyAndRole[]>([]);

  // Deprecated: (20241111 - Liz)
  // eslint-disable-next-line no-console
  console.log('totalPage:', totalPage, 'currentPage:', currentPage, 'companyList:', companyList);

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

    // Deprecated: (20241111 - Liz)
    // eslint-disable-next-line no-console
    console.log('(handleApiResponse) resData:', resData);
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        {!isCallingAPI && userId && (
          <FilterSection<ICompanyAndRole[]>
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
            <p>Add New</p>
          </button>

          <button
            type="button"
            className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <TbCodeCircle size={20} />
            <p>Code</p>
          </button>
        </div>
      </section>

      {isNoData && <NoData />}
      {!isNoData && !isCallingAPI && userId && (
        <>
          <CompanyList
            companyList={companyList}
            toggleChangeTagModal={toggleChangeTagModal}
            setCompanyName={setCompanyName}
          />
          <Pagination
            totalPages={totalPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}

      {/* // Info: (20241108 - Liz)  Modals */}
      <CreateCompanyModal
        isModalOpen={isCreateCompanyModalOpen}
        toggleModal={toggleCreateCompanyModal}
        setIsCallingAPI={setIsCallingAPI}
      />

      <ChangeTagModal
        companyName={companyName}
        isModalOpen={isChangeTagModalOpen}
        toggleModal={toggleChangeTagModal}
      />
    </main>
  );
};

export default MyCompanyListPageBody;
