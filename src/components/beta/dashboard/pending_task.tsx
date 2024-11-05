import Image from 'next/image';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartData } from 'chart.js';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import { useTranslation } from 'next-i18next';
// import { IPendingTask, IPendingTaskTotal } from '@/interfaces/pending_task';

ChartJS.register(ArcElement, Tooltip, Legend);

enum IconName {
  MISSING_CERTIFICATE = 'missing_certificate_icon',
  UNPOSTED_VOUCHERS = 'unposted_vouchers_icon',
  UNARCHIVED_CUSTOMER_DATA = 'unarchived_customer_data_icon',
}

enum TaskTitle {
  MISSING_CERTIFICATE = 'MISSING_CERTIFICATE',
  UNPOSTED_VOUCHERS = 'UNPOSTED_VOUCHERS',
  UNARCHIVED_CUSTOMER_DATA = 'UNARCHIVED_CUSTOMER_DATA',
}

const tasks = [
  {
    iconName: IconName.MISSING_CERTIFICATE,
    title: TaskTitle.MISSING_CERTIFICATE,
  },
  {
    iconName: IconName.UNPOSTED_VOUCHERS,
    title: TaskTitle.UNPOSTED_VOUCHERS,
  },
  {
    iconName: IconName.UNARCHIVED_CUSTOMER_DATA,
    title: TaskTitle.UNARCHIVED_CUSTOMER_DATA,
  },
];

interface DonutChartProps {
  percentageForMissingCertificate: number;
  percentageForUnpostedVouchers: number;
  percentageForUnarchivedCustomerData: number;
  isChartForTotal: boolean;
}

interface CompanyListProps {
  list: {
    companyName: string;
    companyLogoSrc: string;
    count: number;
  }[];
}

const CompanyList = ({ list }: CompanyListProps) => {
  const { t } = useTranslation('common');

  const isListNoData = list.length === 0;

  if (isListNoData) {
    return (
      <div className="text-center text-base font-medium text-text-neutral-mute">
        {t('common:BETA_DASHBOARD.NO_DATA_AVAILABLE')}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-8px">
      {list.map((item) => (
        <div
          key={item.companyName}
          className="flex items-center justify-between gap-8px bg-surface-brand-primary-10 px-8px py-4px"
        >
          <div className="flex items-center gap-8px">
            <div className="h-24px w-24px overflow-hidden rounded-xxs bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS">
              <Image src={item.companyLogoSrc} alt="company_logo" width={24} height={24}></Image>
            </div>
            <p className="text-xs font-semibold text-text-neutral-primary">{item.companyName}</p>
          </div>

          <p className="text-sm font-semibold text-text-neutral-primary">{item.count}</p>
        </div>
      ))}
    </section>
  );
};

const DonutChart = ({
  percentageForMissingCertificate,
  percentageForUnpostedVouchers,
  percentageForUnarchivedCustomerData,
  isChartForTotal,
}: DonutChartProps) => {
  const backgroundColorSwitch = isChartForTotal
    ? ['#FD853A', '#6CDEA0', '#9B8AFB']
    : ['#BDF0D5', '#EBE9FE', '#FFEAD5'];

  const data: ChartData<'doughnut', number[], string> = {
    labels: ['Missing certificate', 'Unposted vouchers', 'Unarchived customer data'],
    datasets: [
      {
        data: [
          percentageForMissingCertificate,
          percentageForUnpostedVouchers,
          percentageForUnarchivedCustomerData,
        ],
        backgroundColor: backgroundColorSwitch, // Info: (20241017 - Liz) 區塊顏色依照順序設定
        borderWidth: 0,
      },
    ],
  };

  return (
    <Doughnut
      data={data}
      options={{
        responsive: true,
        plugins: {
          legend: {
            display: false, // Info: (20241018 - Liz) Disable the default legend
          },
          tooltip: {
            // Info: (20241018 - Liz) 可以設定 tooltip 的顯示內容或者關閉
            // enabled: false,
          },
        },
        cutout: '20%', // Info: (20241018 - Liz) This creates the donut hole
      }}
    />
  );
};

const TaskType = ({ iconName, title }: { iconName: IconName; title: TaskTitle }) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center gap-8px">
      <Image
        src={`/icons/${iconName}.svg`}
        alt={'Pending Task Type Icon'}
        width={22}
        height={22}
        className="h-22px w-22px"
      ></Image>
      <h4 className="text-xs font-semibold text-text-neutral-primary">
        {t(`common:BETA_DASHBOARD.${title}`)}
      </h4>
    </div>
  );
};

const PendingTasksNoData = () => {
  const { t } = useTranslation('common');

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('common:BETA_DASHBOARD.PENDING_TASKS')}
      </h3>
      <div className="flex flex-col items-center">
        <Image src={'/images/empty.svg'} alt="empty_image" width={120} height={134.787}></Image>
        <p className="text-base font-medium text-text-neutral-mute">
          {t('common:BETA_DASHBOARD.NO_DATA')}
        </p>
      </div>
    </section>
  );
};

const PendingTasksForCompany = () => {
  // ToDo: (20241105 - Liz) 這是假資料，等之後串真正資料後再刪除
  const countForMissingCertificate: number = 40;
  const countForUnpostedVouchers: number = 10;
  const countForUnarchivedCustomerData: number = 40;
  const total =
    countForMissingCertificate + countForUnpostedVouchers + countForUnarchivedCustomerData;
  const percentageForMissingCertificate = Math.ceil((countForMissingCertificate / total) * 100);
  const percentageForUnpostedVouchers = Math.ceil((countForUnpostedVouchers / total) * 100);
  const percentageForUnarchivedCustomerData =
    countForUnarchivedCustomerData === 0
      ? 0
      : 100 - percentageForMissingCertificate - percentageForUnpostedVouchers;

  const { t } = useTranslation('common');
  const handleAddToMyCalendar = () => {
    // ToDo: (20241105 - Liz)
  };

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('common:BETA_DASHBOARD.PENDING_TASKS')}
      </h3>

      {/* --- Chart Section --- */}
      <section className="flex items-center gap-16px">
        <div className="w-160px">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVouchers={percentageForUnpostedVouchers}
            percentageForUnarchivedCustomerData={percentageForUnarchivedCustomerData}
            isChartForTotal={false}
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          <div className="flex items-center justify-between">
            <TaskType
              iconName={IconName.MISSING_CERTIFICATE}
              title={TaskTitle.MISSING_CERTIFICATE}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {countForMissingCertificate}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <TaskType iconName={IconName.UNPOSTED_VOUCHERS} title={TaskTitle.UNPOSTED_VOUCHERS} />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {countForUnpostedVouchers}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <TaskType
              iconName={IconName.UNARCHIVED_CUSTOMER_DATA}
              title={TaskTitle.UNARCHIVED_CUSTOMER_DATA}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {countForUnarchivedCustomerData}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-24px">
        {/* --- List Section ---  */}
        {tasks.map((task) => (
          <section key={task.title} className="flex items-center justify-between">
            <TaskType iconName={task.iconName} title={task.title} />
            <button
              type="button"
              className="text-sm font-semibold text-link-text-primary"
              onClick={handleAddToMyCalendar}
            >
              {t('common:BETA_DASHBOARD.ADD_TO_MY_CALENDAR')}
            </button>
          </section>
        ))}
      </section>
    </section>
  );
};

const PendingTasksForAll = () => {
  const { t } = useTranslation('common');

  // ToDo: (20241105 - Liz) MISSING_CERTIFICATE_LIST, UNPOSTED_VOUCHER_LIST, UNARCHIVED_CUSTOMER_DATA_LIST 是假資料，等之後串真正資料後再刪除
  const MISSING_CERTIFICATE_LIST: {
    companyName: string;
    companyLogoSrc: string;
    count: number;
  }[] = [
    { companyName: 'Company A', companyLogoSrc: '/images/fake_company_log_01.png', count: 50 },
    {
      companyName: 'Company B',
      companyLogoSrc: '/images/fake_company_log_02.png',
      count: 10,
    },
    {
      companyName: 'Company C',
      companyLogoSrc: '/images/fake_company_log_03.png',
      count: 2,
    },
  ];

  const UNPOSTED_VOUCHER_LIST: {
    companyName: string;
    companyLogoSrc: string;
    count: number;
  }[] = [
    { companyName: 'Company A', companyLogoSrc: '/images/fake_company_log_01.png', count: 20 },
    {
      companyName: 'Company B',
      companyLogoSrc: '/images/fake_company_log_02.png',
      count: 10,
    },
    {
      companyName: 'Company C',
      companyLogoSrc: '/images/fake_company_log_03.png',
      count: 8,
    },
  ];

  const UNARCHIVED_CUSTOMER_DATA_LIST: {
    companyName: string;
    companyLogoSrc: string;
    count: number;
  }[] = [];

  const countForMissingCertificate: number = 62;
  const countForUnpostedVouchers: number = 38;
  const countForUnarchivedCustomerData: number = 0;
  const total =
    countForMissingCertificate + countForUnpostedVouchers + countForUnarchivedCustomerData;
  const percentageForMissingCertificate = Math.ceil((countForMissingCertificate / total) * 100);
  const percentageForUnpostedVouchers = Math.ceil((countForUnpostedVouchers / total) * 100);
  const percentageForUnarchivedCustomerData =
    countForUnarchivedCustomerData === 0
      ? 0
      : 100 - percentageForMissingCertificate - percentageForUnpostedVouchers;

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('common:BETA_DASHBOARD.PENDING_TASKS_TOTAL')}
      </h3>

      {/* === Chart Section === */}
      <section className="flex items-center gap-16px">
        <div className="w-160px">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVouchers={percentageForUnpostedVouchers}
            percentageForUnarchivedCustomerData={percentageForUnarchivedCustomerData}
            isChartForTotal
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          {/* Missing certificate */}
          <div className="flex items-center justify-between">
            <TaskType
              iconName={IconName.MISSING_CERTIFICATE}
              title={TaskTitle.MISSING_CERTIFICATE}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {percentageForMissingCertificate}%
            </p>
          </div>

          {/* Unposted vouchers */}
          <div className="flex items-center justify-between">
            <TaskType iconName={IconName.UNPOSTED_VOUCHERS} title={TaskTitle.UNPOSTED_VOUCHERS} />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {percentageForUnpostedVouchers}%
            </p>
          </div>

          {/* Unarchived Customer Data */}
          <div className="flex items-center justify-between">
            <TaskType
              iconName={IconName.UNARCHIVED_CUSTOMER_DATA}
              title={TaskTitle.UNARCHIVED_CUSTOMER_DATA}
            />
            <p className="text-2xl font-bold text-text-brand-secondary-lv2">
              {percentageForUnarchivedCustomerData}%
            </p>
          </div>
        </div>
      </section>

      {/* === List Section === */}
      <section className="flex flex-col gap-24px">
        <div className="flex items-center justify-between">
          <TaskType iconName={IconName.MISSING_CERTIFICATE} title={TaskTitle.MISSING_CERTIFICATE} />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForMissingCertificate}
          </p>
        </div>

        <CompanyList list={MISSING_CERTIFICATE_LIST} />

        <div className="flex items-center justify-between">
          <TaskType iconName={IconName.UNPOSTED_VOUCHERS} title={TaskTitle.UNPOSTED_VOUCHERS} />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForUnpostedVouchers}
          </p>
        </div>

        <CompanyList list={UNPOSTED_VOUCHER_LIST} />

        <div className="flex items-center justify-between">
          <TaskType
            iconName={IconName.UNARCHIVED_CUSTOMER_DATA}
            title={TaskTitle.UNARCHIVED_CUSTOMER_DATA}
          />
          <p className="text-2xl font-bold text-text-brand-secondary-lv2">
            {countForUnarchivedCustomerData}
          </p>
        </div>

        <CompanyList list={UNARCHIVED_CUSTOMER_DATA_LIST} />
      </section>
    </section>
  );
};

const PendingTasks = () => {
  // Info: (20241018 - Liz) 元件顯示邏輯
  // 沒有公司列表 : 顯示 PendingTaskNoData
  // 有公司列表 且 有選擇公司 : 顯示 PendingTasksForCompany
  // 有公司列表 且 沒有選擇公司 : 顯示 PendingTasksForAll

  // ToDo: (20241018 - Liz) 串接真實資料
  // 從 user context 中打 API 取得選擇的公司(selectedCompany)、所有公司的待辦事項(pendingTaskTotal)
  // 依據 selectedCompany 是否有值，轉換為布林值 isSelectedCompany，判斷是否有選擇公司
  // 依據 pendingTaskTotal 是否有值，轉換為布林值 hasCompanyList，判斷是否有公司列表

  /* === Fake Data === */
  // Deprecated: (20241016 - Liz) 這是假資料，等之後串真正資料後再刪除
  const selectedCompany = '123';
  const isSelectedCompany = !!selectedCompany; // 強制轉為布林值
  const hasCompanyList = true;

  if (!hasCompanyList) {
    return (
      <DashboardCardLayout>
        <PendingTasksNoData />
      </DashboardCardLayout>
    );
  }

  if (isSelectedCompany) {
    return (
      <DashboardCardLayout>
        <PendingTasksForCompany />
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
