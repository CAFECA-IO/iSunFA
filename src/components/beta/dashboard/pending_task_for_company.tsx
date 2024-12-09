import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import DonutChart from '@/components/beta/dashboard/donut_chart';
import TaskType from '@/components/beta/dashboard/task_type';
import { IPendingTask, PendingTaskIconName, TaskTitle } from '@/interfaces/pending_task';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useEffect, useState } from 'react';
import PendingTaskNoData from '@/components/beta/dashboard/pending_task_no_data';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';

const TASKS_ICON = [
  {
    iconName: PendingTaskIconName.MISSING_CERTIFICATE,
    title: TaskTitle.MISSING_CERTIFICATE,
  },
  {
    iconName: PendingTaskIconName.UNPOSTED_VOUCHERS,
    title: TaskTitle.UNPOSTED_VOUCHERS,
  },
];

const PendingTaskForCompany = () => {
  const { t } = useTranslation('dashboard');
  const { selectedCompany } = useUserCtx();
  const [companyPendingTask, setCompanyPendingTask] = useState<IPendingTask>();

  // Info: (20241127 - Liz) 打 API 取得使用者的待辦任務(公司)
  const { trigger: getCompanyPendingTaskAPI } = APIHandler<IPendingTask>(
    APIName.COMPANY_PENDING_TASK_GET
  );

  useEffect(() => {
    if (!selectedCompany) return;

    const getCompanyPendingTask = async () => {
      try {
        const { data, success, code } = await getCompanyPendingTaskAPI({
          params: { companyId: selectedCompany.id },
        });

        if (success && data) {
          setCompanyPendingTask(data);
        } else {
          // Deprecated: (20241127 - Liz)
          // eslint-disable-next-line no-console
          console.log('PendingTaskForCompany getCompanyPendingTask code:', code);
        }
      } catch (error) {
        // Deprecated: (20241127 - Liz)
        // eslint-disable-next-line no-console
        console.log('PendingTaskForCompany getCompanyPendingTask error:', error);
      }
    };

    getCompanyPendingTask();
  }, [selectedCompany]);

  const handleAddEvent = () => {
    // ToDo: (20241105 - Liz)
  };

  if (!companyPendingTask) {
    return <PendingTaskNoData />;
  }

  const isCompanyPendingTaskEmpty =
    companyPendingTask.missingCertificate.count === 0 &&
    companyPendingTask.unpostedVoucher.count === 0 &&
    companyPendingTask.missingCertificatePercentage === 0 &&
    companyPendingTask.unpostedVoucherPercentage === 0;

  if (isCompanyPendingTaskEmpty) {
    return <PendingTaskNoData />;
  }

  const percentageForMissingCertificate = companyPendingTask.missingCertificatePercentage * 100;
  const percentageForUnpostedVouchers = companyPendingTask.unpostedVoucherPercentage * 100;

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.PENDING_TASKS')}
      </h3>

      {/* Info: (20241127 - Liz) --- Chart Section --- */}
      <section className="flex items-center gap-16px">
        <div className="w-160px">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVouchers={percentageForUnpostedVouchers}
            isChartForTotal={false}
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          <div className="flex items-center justify-between">
            <TaskType
              iconName={PendingTaskIconName.MISSING_CERTIFICATE}
              title={TaskTitle.MISSING_CERTIFICATE}
            />
            <Link
              href={ISUNFA_ROUTE.CERTIFICATE_LIST}
              className="text-2xl font-bold text-text-brand-secondary-lv2"
            >
              {companyPendingTask.missingCertificate.count}
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <TaskType
              iconName={PendingTaskIconName.UNPOSTED_VOUCHERS}
              title={TaskTitle.UNPOSTED_VOUCHERS}
            />
            <Link
              href={ISUNFA_ROUTE.ADD_NEW_VOUCHER}
              className="text-2xl font-bold text-text-brand-secondary-lv2"
            >
              {companyPendingTask.unpostedVoucher.count}
            </Link>
          </div>
        </div>
      </section>

      {/* Info: (20241127 - Liz) --- List Section ---  */}
      <section className="flex flex-col gap-24px">
        {TASKS_ICON.map((task) => (
          <section key={task.title} className="flex items-center justify-between">
            <TaskType iconName={task.iconName} title={task.title} />
            <button
              type="button"
              className="text-sm font-semibold text-link-text-primary"
              onClick={handleAddEvent}
            >
              {t('dashboard:DASHBOARD.ADD_EVENT')}
            </button>
          </section>
        ))}
      </section>
    </section>
  );
};

export default PendingTaskForCompany;
