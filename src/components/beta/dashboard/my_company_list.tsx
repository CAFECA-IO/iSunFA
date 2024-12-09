import Image from 'next/image';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { ICompanyAndRole } from '@/interfaces/company';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';

interface NoDataProps {
  toggleCreateCompanyModal: () => void;
}
const NoData = ({ toggleCreateCompanyModal }: NoDataProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-col items-center justify-center py-26px">
      <p className="text-base text-text-neutral-mute">
        {t('dashboard:DASHBOARD.COMPANY_NOT_YET_CREATED')}
      </p>
      <p className="text-base text-text-neutral-mute">
        {t('dashboard:DASHBOARD.PLEASE_PROCEED_TO')}{' '}
        <button
          type="button"
          onClick={toggleCreateCompanyModal}
          className="text-text-neutral-link underline underline-offset-4"
        >
          {t('dashboard:DASHBOARD.CREATE_A_COMPANY')}
        </button>
      </p>
    </div>
  );
};

interface CompanyItemProps {
  companyAndRole: ICompanyAndRole;
  setCompanyToSelect: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const CompanyItem = ({ companyAndRole, setCompanyToSelect }: CompanyItemProps) => {
  const { selectedCompany } = useUserCtx();
  const isCompanySelected = companyAndRole.company.id === selectedCompany?.id;

  const openMessageModal = () => {
    setCompanyToSelect(companyAndRole);
  };

  return (
    <button
      key={companyAndRole.company.id}
      type="button"
      onClick={openMessageModal}
      disabled={isCompanySelected}
      className={`h-100px w-100px overflow-hidden rounded-sm shadow-Dropshadow_XS ${
        isCompanySelected
          ? 'border-2 border-stroke-brand-primary bg-surface-brand-primary-10'
          : 'bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10'
      }`}
    >
      <Image
        src={companyAndRole.company.imageId}
        alt={companyAndRole.company.name}
        width={100}
        height={100}
      ></Image>
    </button>
  );
};

interface CompanyListProps {
  companyAndRoleList: ICompanyAndRole[];
  setCompanyToSelect: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const CompanyList = ({ companyAndRoleList, setCompanyToSelect }: CompanyListProps) => {
  return (
    <div className="flex justify-center gap-40px">
      {companyAndRoleList.map((companyAndRole) => (
        <CompanyItem
          key={companyAndRole.company.id}
          companyAndRole={companyAndRole}
          setCompanyToSelect={setCompanyToSelect}
        />
      ))}
    </div>
  );
};

const MyCompanyList = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [companyAndRoleList, setCompanyAndRoleList] = useState<ICompanyAndRole[]>([]);
  const isCompanyListEmpty = companyAndRoleList.length === 0;
  const [companyToSelect, setCompanyToSelect] = useState<ICompanyAndRole | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);

  // Info: (20241126 - Liz) 選擇公司 API
  const { selectCompany } = useUserCtx();

  const closeMessageModal = () => {
    setCompanyToSelect(undefined);
  };

  const toggleCreateCompanyModal = () => {
    setIsCreateCompanyModalOpen((prev) => !prev);
  };

  // Info: (20241126 - Liz) 打 API 選擇公司
  const handleSelectCompany = () => {
    if (isLoading) return;
    if (!companyToSelect) return;

    setIsLoading(true);

    try {
      selectCompany(companyToSelect.company.id);
    } catch (error) {
      // Deprecated: (20241126 - Liz)
      // eslint-disable-next-line no-console
      console.log('CompanyList handleConnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('dashboard:DASHBOARD.CHOOSE_THE_COMPANY'),
    content: (
      <div>
        <p className="font-normal text-text-neutral-secondary">
          {t('dashboard:DASHBOARD.ARE_YOU_SURE_YOU_WANT_TO')}{' '}
          <span className="font-semibold">{t('dashboard:DASHBOARD.CHOOSE_THE_COMPANY')}</span>{' '}
          {t('dashboard:DASHBOARD.SURE')}
        </p>
        <br />
        <p className="font-semibold text-text-neutral-primary">{companyToSelect?.company.name}</p>
      </div>
    ),
    submitBtnStr: t('dashboard:DASHBOARD.CHOOSE'),
    submitBtnFunction: handleSelectCompany,
    messageType: MessageType.WARNING,
    backBtnFunction: closeMessageModal,
    backBtnStr: t('dashboard:COMMON.CANCEL'),
  };

  // Info: (20241120 - Liz) 打 API 取得使用者擁有的公司列表 (simple version)
  const { trigger: listUserCompanyAPI } = APIHandler<ICompanyAndRole[]>(APIName.LIST_USER_COMPANY);

  const getCompanyList = useCallback(async () => {
    if (!userAuth) return;

    try {
      const {
        data: userCompanyList,
        success,
        code,
      } = await listUserCompanyAPI({
        params: { userId: userAuth.id },
        query: { simple: true },
      });

      if (success && userCompanyList && userCompanyList.length > 0) {
        // Info: (20241126 - Liz) 取得使用者擁有的公司列表成功，依照 ICompanyAndRole.company.id 降冪排序並取前三個
        const recentCompanies = userCompanyList
          .sort((a, b) => b.company.id - a.company.id)
          .slice(0, 3);

        setCompanyAndRoleList(recentCompanies);
      } else {
        // Info: (20241120 - Liz) 取得使用者擁有的公司列表失敗時顯示錯誤訊息
        // Deprecated: (20241120 - Liz)
        // eslint-disable-next-line no-console
        console.log('listUserCompanyAPI(Simple) failed:', code);
      }
    } catch (error) {
      // Deprecated: (20241120 - Liz)
      // eslint-disable-next-line no-console
      console.error('listUserCompanyAPI(Simple) error:', error);
    }
  }, [userAuth]);

  useEffect(() => {
    getCompanyList();
  }, [getCompanyList]);

  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-32px">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:DASHBOARD.MY_COMPANY_LIST')}
          </h3>

          <MoreLink href={ISUNFA_ROUTE.MY_COMPANY_LIST_PAGE} />
        </div>

        {isCompanyListEmpty ? (
          <NoData toggleCreateCompanyModal={toggleCreateCompanyModal} />
        ) : (
          <CompanyList
            companyAndRoleList={companyAndRoleList}
            setCompanyToSelect={setCompanyToSelect}
          />
        )}

        {/* // Info: (20241209 - Liz) Modals */}
        {companyToSelect && (
          <MessageModal
            messageModalData={messageModalData}
            isModalVisible={!!companyToSelect}
            modalVisibilityHandler={closeMessageModal}
          />
        )}

        {isCreateCompanyModalOpen && (
          <CreateCompanyModal
            isModalOpen={isCreateCompanyModalOpen}
            toggleModal={toggleCreateCompanyModal}
            getCompanyList={getCompanyList}
          />
        )}
      </section>
    </DashboardCardLayout>
  );
};

export default MyCompanyList;
