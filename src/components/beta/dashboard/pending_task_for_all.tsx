import { useEffect, useState } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import DonutChart from '@/components/beta/dashboard/donut_chart';
import TaskType from '@/components/beta/dashboard/task_type';
import { IPendingTaskTotal, PendingTaskIconName, TaskTitle } from '@/interfaces/pending_task';
import PendingTaskNoData from '@/components/beta/dashboard/pending_task_no_data';
import AccountBookListForPendingTask from '@/components/beta/dashboard/account_book_list_for_pending_task';
import loggerFront from '@/lib/utils/logger_front';

const PendingTaskForAll = () => {
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
          loggerFront.log('PendingTaskForAll getUserPendingTaskAPI code:', code);
        }
      } catch (error) {
        loggerFront.error('PendingTaskForAll getUserPendingTaskAPI error:', error);
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

  const percentageForMissingCertificate = Math.round(
    userPendingTaskTotal.totalMissingCertificatePercentage * 100
  );
  const percentageForUnpostedVouchers = Math.round(
    userPendingTaskTotal.totalUnpostedVoucherPercentage * 100
  );
  const countForMissingCertificate = userPendingTaskTotal.totalMissingCertificate;
  const countForUnpostedVouchers = userPendingTaskTotal.totalUnpostedVoucher;

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.PENDING_TASKS_TOTAL')}
      </h3>

      {/* Info: (20241209 - Liz) Chart Section */}
      <section className="flex items-center gap-24px">
        <DonutChart
          percentageForMissingCertificate={percentageForMissingCertificate}
          percentageForUnpostedVouchers={percentageForUnpostedVouchers}
          isChartForTotal
        />

        <div className="flex flex-auto flex-col gap-16px">
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

      {/* Info: (20241209 - Liz) List Section */}
      <section className="flex flex-col gap-24px">
        <div className="flex items-center justify-between">
          <TaskType
            iconName={PendingTaskIconName.MISSING_CERTIFICATE}
            title={TaskTitle.MISSING_CERTIFICATE}
            alwaysNeedTitle
          />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForMissingCertificate}
          </p>
        </div>

        <AccountBookListForPendingTask list={userPendingTaskTotal.missingCertificateList} />

        <div className="flex items-center justify-between">
          <TaskType
            iconName={PendingTaskIconName.UNPOSTED_VOUCHERS}
            title={TaskTitle.UNPOSTED_VOUCHERS}
            alwaysNeedTitle
          />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForUnpostedVouchers}
          </p>
        </div>

        <AccountBookListForPendingTask list={userPendingTaskTotal.unpostedVoucherList} />
      </section>
    </section>
  );
};

export default PendingTaskForAll;
