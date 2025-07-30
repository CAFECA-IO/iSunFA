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
import CreateTodoModal from '@/components/beta/todo_list_page/create_todo_modal';
import loggerFront from '@/lib/utils/logger_front';

const PENDING_TASK = [
  {
    iconName: PendingTaskIconName.MISSING_CERTIFICATE,
    title: TaskTitle.MISSING_CERTIFICATE,
  },
  {
    iconName: PendingTaskIconName.UNPOSTED_VOUCHERS,
    title: TaskTitle.UNPOSTED_VOUCHERS,
  },
];

interface PendingTaskForCompanyProps {
  getTodoList: () => Promise<void>;
}

const PendingTaskForAccountBook = ({ getTodoList }: PendingTaskForCompanyProps) => {
  const { t } = useTranslation('dashboard');
  const { connectedAccountBook } = useUserCtx();
  const [pendingTask, setPendingTask] = useState<IPendingTask | null>(null);
  const [isCreateTodoModalOpen, setIsCreateTodoModalOpen] = useState(false);
  const [defaultTodoName, setDefaultTodoName] = useState('');

  const toggleCreateTodoModal = () => setIsCreateTodoModalOpen((prev) => !prev);

  // Info: (20241127 - Liz) 打 API 取得使用者的待辦任務(使用者已連結帳本)
  const { trigger: getAccountBookPendingTaskAPI } = APIHandler<IPendingTask>(
    APIName.ACCOUNT_BOOK_PENDING_TASK_GET
  );

  useEffect(() => {
    if (!connectedAccountBook) return;

    const getAccountBookPendingTask = async () => {
      try {
        const { data, success, code } = await getAccountBookPendingTaskAPI({
          params: { accountBookId: connectedAccountBook.id },
        });

        if (success) {
          setPendingTask(data);
        } else {
          loggerFront.log('PendingTaskForAccountBook getAccountBookPendingTask code:', code);
        }
      } catch (error) {
        loggerFront.error('PendingTaskForAccountBook getAccountBookPendingTask error:', error);
      }
    };

    getAccountBookPendingTask();
  }, [connectedAccountBook]);

  const handleAddEvent = (title: string) => {
    toggleCreateTodoModal();
    const translatedTodoName = t(`dashboard:DASHBOARD.${title}`);
    setDefaultTodoName(translatedTodoName);
  };

  if (!pendingTask) {
    return <PendingTaskNoData />;
  }

  const isCompanyPendingTaskEmpty =
    pendingTask.missingCertificate.count === 0 &&
    pendingTask.unpostedVoucher.count === 0 &&
    pendingTask.missingCertificatePercentage === 0 &&
    pendingTask.unpostedVoucherPercentage === 0;

  if (isCompanyPendingTaskEmpty) {
    return <PendingTaskNoData />;
  }

  const percentageForMissingCertificate = Math.round(
    pendingTask.missingCertificatePercentage * 100
  );
  const percentageForUnpostedVouchers = Math.round(pendingTask.unpostedVoucherPercentage * 100);

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.PENDING_TASKS')}
      </h3>

      {/* Info: (20241127 - Liz) --- Chart Section --- */}
      <section className="flex items-center gap-24px">
        <DonutChart
          percentageForMissingCertificate={percentageForMissingCertificate}
          percentageForUnpostedVouchers={percentageForUnpostedVouchers}
          isChartForTotal={false}
        />

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
              {pendingTask.missingCertificate.count}
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
              {pendingTask.unpostedVoucher.count}
            </Link>
          </div>
        </div>
      </section>

      {/* Info: (20241127 - Liz) --- List Section ---  */}
      <section className="flex flex-col gap-24px">
        {PENDING_TASK.map((task) => (
          <section key={task.title} className="flex items-center justify-between">
            <TaskType iconName={task.iconName} title={task.title} alwaysNeedTitle />
            <button
              type="button"
              className="text-sm font-semibold text-link-text-primary"
              onClick={() => handleAddEvent(task.title)}
            >
              {t('dashboard:DASHBOARD.ADD_EVENT')}
            </button>
          </section>
        ))}
      </section>

      {/* Info: (20241220 - Liz) Modal */}
      {isCreateTodoModalOpen && (
        <CreateTodoModal
          toggleModal={toggleCreateTodoModal}
          getTodoList={getTodoList}
          defaultTodoName={defaultTodoName}
          defaultAccountBook={connectedAccountBook ?? undefined}
        />
      )}
    </section>
  );
};

export default PendingTaskForAccountBook;
