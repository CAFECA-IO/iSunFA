import { useEffect, useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { ICompanyAndRole } from '@/interfaces/company';
import { APIName } from '@/constants/api_connection';
import DonutChart from '@/components/beta/dashboard/donut_chart';
import TaskType from '@/components/beta/dashboard/task_type';
import PendingTasksForCompany from '@/components/beta/dashboard/pending_task_for_company';
import {
  IPendingTaskTotal,
  PendingTaskIconName,
  TaskTitle,
  IMissingCertificate,
} from '@/interfaces/pending_task';
import Image from 'next/image';
import PendingTaskNoData from '@/components/beta/dashboard/pending_task_no_data';

interface CompanyListProps {
  list: IMissingCertificate[]; // Info: (20250109 - Liz) IMissingCertificate 與 IUnpostedVoucher 相同
}

const CompanyList = ({ list }: CompanyListProps) => {
  const { t } = useTranslation('dashboard');

  const isListNoData = list.length === 0;

  if (isListNoData) {
    return (
      <div className="text-center text-base font-medium text-text-neutral-mute">
        {t('dashboard:DASHBOARD.NO_DATA_AVAILABLE')}
      </div>
    );
  }

  // Info: (20250109 - Liz) 依照 list.count 由大到小排序(降冪)
  list.sort((a, b) => b.count - a.count);

  return (
    <section className="flex flex-col gap-8px">
      {list.map((item) => (
        <div
          key={item.companyId}
          className="flex items-center justify-between gap-8px bg-surface-brand-primary-10 px-8px py-4px"
        >
          <div className="flex items-center gap-8px">
            <div className="h-24px w-24px overflow-hidden rounded-xxs border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
              <Image src={item.companyLogoSrc} alt="company_logo" width={24} height={24} />
            </div>
            <p className="text-xs font-semibold text-text-neutral-primary">{item.companyName}</p>
          </div>

          <p className="text-sm font-semibold text-text-neutral-primary">{item.count}</p>
        </div>
      ))}
    </section>
  );
};

const PendingTasksForAll = () => {
  const { t } = useTranslation('dashboard');
  const [userPendingTaskTotal, setUserPendingTaskTotal] = useState<IPendingTaskTotal>();
  const { userAuth } = useUserCtx();

  // Info: (20241127 - Liz) 打 API 取得使用者的待辦任務(總數)
  const { trigger: getUserPendingTaskAPI } = APIHandler<IPendingTaskTotal>(
    APIName.USER_PENDING_TASK_GET
  );

  useEffect(() => {
    if (!userAuth) return;

    const getUserPendingTask = async () => {
      try {
        const { data, success, code } = await getUserPendingTaskAPI({
          params: { userId: userAuth.id },
        });

        if (success && data) {
          setUserPendingTaskTotal(data);
        } else {
          // Deprecated: (20241127 - Liz)
          // eslint-disable-next-line no-console
          console.log('PendingTasksForAll getUserPendingTaskAPI code:', code);
        }
      } catch (error) {
        // Deprecated: (20241127 - Liz)
        // eslint-disable-next-line no-console
        console.log('PendingTasksForAll getUserPendingTaskAPI error:', error);
      }
    };

    getUserPendingTask();
  }, [userAuth]);

  if (!userPendingTaskTotal) {
    return <PendingTaskNoData />;
  }

  const isUserPendingTaskTotalEmpty =
    userPendingTaskTotal.totalMissingCertificate === 0 &&
    userPendingTaskTotal.totalUnpostedVoucher === 0 &&
    userPendingTaskTotal.totalMissingCertificatePercentage === 0 &&
    userPendingTaskTotal.totalUnpostedVoucherPercentage === 0;

  if (isUserPendingTaskTotalEmpty) {
    return <PendingTaskNoData />;
  }

  const percentageForMissingCertificate =
    userPendingTaskTotal.totalMissingCertificatePercentage * 100;
  const percentageForUnpostedVouchers = userPendingTaskTotal.totalUnpostedVoucherPercentage * 100;
  const countForMissingCertificate = userPendingTaskTotal.totalMissingCertificate;
  const countForUnpostedVouchers = userPendingTaskTotal.totalUnpostedVoucher;

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.PENDING_TASKS_TOTAL')}
      </h3>

      {/* === // Info: (20241209 - Liz) Chart Section === */}
      <section className="flex items-center gap-16px">
        <div className="w-160px">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVouchers={percentageForUnpostedVouchers}
            isChartForTotal
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          <div className="flex items-center justify-between">
            <TaskType
              iconName={PendingTaskIconName.MISSING_CERTIFICATE}
              title={TaskTitle.MISSING_CERTIFICATE}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {percentageForMissingCertificate}%
            </p>
          </div>

          <div className="flex items-center justify-between">
            <TaskType
              iconName={PendingTaskIconName.UNPOSTED_VOUCHERS}
              title={TaskTitle.UNPOSTED_VOUCHERS}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {percentageForUnpostedVouchers}%
            </p>
          </div>
        </div>
      </section>

      {/* === // Info: (20241209 - Liz) List Section === */}
      <section className="flex flex-col gap-24px">
        <div className="flex items-center justify-between">
          <TaskType
            iconName={PendingTaskIconName.MISSING_CERTIFICATE}
            title={TaskTitle.MISSING_CERTIFICATE}
          />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForMissingCertificate}
          </p>
        </div>

        <CompanyList list={userPendingTaskTotal.missingCertificateList} />

        <div className="flex items-center justify-between">
          <TaskType
            iconName={PendingTaskIconName.UNPOSTED_VOUCHERS}
            title={TaskTitle.UNPOSTED_VOUCHERS}
          />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForUnpostedVouchers}
          </p>
        </div>

        <CompanyList list={userPendingTaskTotal.unpostedVoucherList} />
      </section>
    </section>
  );
};

interface PendingTasksProps {
  getTodoList: () => Promise<void>;
}

const PendingTasks = ({ getTodoList }: PendingTasksProps) => {
  // Info: (20241018 - Liz) 元件顯示邏輯
  // 沒有公司列表 : 顯示 PendingTaskNoData
  // 有公司列表 且 有選擇公司 : 顯示 PendingTasksForCompany
  // 有公司列表 且 沒有選擇公司 : 顯示 PendingTasksForAll

  const { userAuth, selectedAccountBook } = useUserCtx();
  const isSelectedCompany = !!selectedAccountBook; // 強制轉為布林值
  const [companyAndRoleList, setCompanyAndRoleList] = useState<ICompanyAndRole[]>([]);
  const hasCompanyList = companyAndRoleList.length > 0;

  // Info: (20241127 - Liz) 打 API 取得使用者擁有的公司列表 (simple version)
  const { trigger: listUserCompanyAPI } = APIHandler<ICompanyAndRole[]>(APIName.LIST_USER_COMPANY);

  useEffect(() => {
    const getCompanyList = async () => {
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
          // Info: (20241127 - Liz) 取得使用者擁有的公司列表成功
          setCompanyAndRoleList(userCompanyList);
        } else {
          // Info: (20241127 - Liz)  取得使用者擁有的公司列表失敗時顯示錯誤訊息
          // Deprecated: (20241127 - Liz)
          // eslint-disable-next-line no-console
          console.log('listUserCompanyAPI(Simple) failed:', code);
        }
      } catch (error) {
        // Deprecated: (20241127 - Liz)
        // eslint-disable-next-line no-console
        console.error('listUserCompanyAPI(Simple) error:', error);
      }
    };

    getCompanyList();
  }, [userAuth]);

  if (!hasCompanyList) {
    return (
      <DashboardCardLayout>
        <PendingTaskNoData />
      </DashboardCardLayout>
    );
  }

  if (isSelectedCompany) {
    return (
      <DashboardCardLayout>
        <PendingTasksForCompany getTodoList={getTodoList} />
      </DashboardCardLayout>
    );
  }

  return (
    <DashboardCardLayout>
      <PendingTasksForAll />
    </DashboardCardLayout>
  );
};

export default PendingTasks;
