import Image from 'next/image';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
// import { IPendingTask, IPendingTaskTotal } from '@/interfaces/pending_task';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  percentageForMissingCertificate: number;
  percentageForUnpostedVoucher: number;
}

interface CompanyListProps {
  list: {
    companyName: string;
    companyLogoSrc: string;
    count: number;
  }[];
}

/* === 規劃 Todo === */
// ToDo: (20241016 - Liz) 從 user context 中打 API 取得選擇的公司(selectedCompany)
// 如果有選擇公司，就顯示 PendingTasksForCompany 元件
// 如果沒有選擇公司，就打 API 取得所有公司的 PendingTasksTotal
// 如果 pendingTaskTotal 有值，就顯示 PendingTasksTotal 元件
// 如果 pendingTaskTotal 沒有值，就顯示 EmptyPendingTask 元件

/* === 研究資料格式 === */
// ToDo: (20241016 - Liz) 已選擇的公司的待辦事項
// const pendingTaskForCompany: IPendingTask = {
//   id: 1,
//   companyId: 1,
//   missingCertificate: {
//     id: 1,
//     companyId: 1,
//     count: 50,
//   },
//   unpostedVoucher: {
//     id: 1,
//     companyId: 1,
//     count: 20,
//   },
// };

// const countForMissingCertificate = pendingTaskForCompany.missingCertificate.count;
// const countForUnpostedVoucher = pendingTaskForCompany.unpostedVoucher.count;
// const total = countForMissingCertificate + countForUnpostedVoucher;
// const percentageForMissingCertificate = (countForMissingCertificate / total) * 100;
// const percentageForUnpostedVoucher = (countForUnpostedVoucher / total) * 100;

// ToDo: (20241016 - Liz) 所有公司的待辦事項
// const pendingTaskTotal: IPendingTaskTotal = {
//   id: 1,
//   userId: 1,
//   totalMissingCertificate: 62,
//   missingCertificateList: [
//     {
//       id: 1,
//       companyId: 1,
//       count: 50,
//     },
//     {
//       id: 2,
//       companyId: 2,
//       count: 10,
//     },
//     {
//       id: 3,
//       companyId: 3,
//       count: 2,
//     },
//   ],
//   totalUnpostedVoucher: 38,
//   unpostedVoucherList: [
//     {
//       id: 1,
//       companyId: 1,
//       count: 20,
//     },
//     {
//       id: 2,
//       companyId: 2,
//       count: 10,
//     },
//     {
//       id: 3,
//       companyId: 3,
//       count: 8,
//     },
//   ],
// };

// const countForMissingCertificate = pendingTaskTotal.totalMissingCertificate;
// const countForUnpostedVoucher = pendingTaskTotal.totalUnpostedVoucher;
// const total = countForMissingCertificate + countForUnpostedVoucher;
// const percentageForMissingCertificate = (countForMissingCertificate / total) * 100;
// const percentageForUnpostedVoucher = (countForUnpostedVoucher / total) * 100;

/* === Fake Data === */
// Deprecated: (20241016 - Liz) 這是假資料，等之後串真正資料後再刪除
const selectedCompany = '123';
const isSelectedCompanyExist = selectedCompany;
const isPendingTasksTotalExist = true;

const EmptyPendingTask = () => {
  return (
    <section>
      <h3>Pending tasks</h3>
      <p>No Data</p>
    </section>
  );
};

const DonutChart = ({
  percentageForMissingCertificate,
  percentageForUnpostedVoucher,
}: DonutChartProps) => {
  const data = {
    labels: ['Missing certificate', 'Unposted vouchers'],
    datasets: [
      {
        data: [percentageForMissingCertificate, percentageForUnpostedVoucher],
        backgroundColor: ['#FFB946', '#1C4E80'], // Colors for each section
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Disable the default legend
      },
    },
    cutout: '20%', // This creates the donut hole
  };

  return <Doughnut data={data} options={options} />;
};

const PendingTasksForCompany = () => {
  // Deprecated: (20241016 - Liz) 這是假資料，等之後串真正資料後再刪除
  const countForMissingCertificate = 70;
  const countForUnpostedVoucher = 30;
  const total = countForMissingCertificate + countForUnpostedVoucher;
  const percentageForMissingCertificate = (countForMissingCertificate / total) * 100;
  const percentageForUnpostedVoucher = (countForUnpostedVoucher / total) * 100;

  return (
    <section className="flex flex-col gap-24px border-2 border-lime-400">
      <h3 className="text-xl font-bold text-text-neutral-secondary">Pending tasks (Total)</h3>

      {/* Chart */}
      <section className="flex items-center gap-16px border-2 border-sky-400">
        <div className="w-160px border-2 border-lime-400">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVoucher={percentageForUnpostedVoucher}
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8px">
              <Image
                src={'/icons/missing_certificate_icon.svg'}
                alt="missing_certificate_icon"
                width={22}
                height={22}
              ></Image>
              <h4>Missing certificate</h4>
            </div>
            <p>{percentageForMissingCertificate}%</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8px">
              <Image
                src={'/icons/unposted_vouchers_icon.svg'}
                alt="unposted_vouchers_icon"
                width={22}
                height={22}
              ></Image>
              <h4>Unposted vouchers</h4>
            </div>
            <p>{percentageForUnpostedVoucher}%</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8px">
          <Image
            src={'/icons/missing_certificate_icon.svg'}
            alt="missing_certificate_icon"
            width={22}
            height={22}
          ></Image>
          <h4>Missing certificate</h4>
        </div>
        <p>
          {countForMissingCertificate} ({percentageForMissingCertificate}%)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8px">
          <Image
            src={'/icons/unposted_vouchers_icon.svg'}
            alt="unposted_vouchers_icon"
            width={22}
            height={22}
          ></Image>
          <h4>Unposted vouchers</h4>
        </div>
        <p>
          {countForUnpostedVoucher} ({percentageForUnpostedVoucher}%)
        </p>
      </div>
    </section>
  );
};

const CompanyList = ({ list }: CompanyListProps) => {
  return (
    <section className="flex flex-col gap-8px">
      {list.map((item) => (
        <div
          key={item.companyName}
          className="flex items-center justify-between bg-surface-brand-primary-10 px-8px py-4px"
        >
          <div className="flex items-center gap-8px">
            <Image src={item.companyLogoSrc} alt="company_logo" width={24} height={24}></Image>
            <h4>{item.companyName}</h4>
          </div>
          <p>{item.count}</p>
        </div>
      ))}
    </section>
  );
};

const PendingTasksTotal = () => {
  // Deprecated: (20241016 - Liz) 這是假資料，等之後串真正資料後再刪除
  const missingCertificateList = [
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

  const unpostedVoucherList = [
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
  const countForMissingCertificate = 62;
  const countForUnpostedVoucher = 38;
  const total = countForMissingCertificate + countForUnpostedVoucher;
  const percentageForMissingCertificate = (countForMissingCertificate / total) * 100;
  const percentageForUnpostedVoucher = (countForUnpostedVoucher / total) * 100;

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">Pending tasks (Total)</h3>

      {/* Chart */}
      <section className="flex items-center gap-16px">
        <div className="w-160px">
          <DonutChart
            percentageForMissingCertificate={percentageForMissingCertificate}
            percentageForUnpostedVoucher={percentageForUnpostedVoucher}
          />
        </div>

        <div className="flex grow flex-col gap-16px">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8px">
              <Image
                src={'/icons/missing_certificate_icon.svg'}
                alt="missing_certificate_icon"
                width={22}
                height={22}
              ></Image>
              <h4>Missing certificate</h4>
            </div>
            <p>{percentageForMissingCertificate}%</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8px">
              <Image
                src={'/icons/unposted_vouchers_icon.svg'}
                alt="unposted_vouchers_icon"
                width={22}
                height={22}
              ></Image>
              <h4>Unposted vouchers</h4>
            </div>
            <p>{percentageForUnpostedVoucher}%</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8px">
          <Image
            src={'/icons/missing_certificate_icon.svg'}
            alt="missing_certificate_icon"
            width={22}
            height={22}
          ></Image>
          <h4>Missing certificate</h4>
        </div>
        <p>
          {countForMissingCertificate} ({percentageForMissingCertificate}%)
        </p>
      </div>

      <CompanyList list={missingCertificateList} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8px">
          <Image
            src={'/icons/unposted_vouchers_icon.svg'}
            alt="unposted_vouchers_icon"
            width={22}
            height={22}
          ></Image>
          <h4>Unposted vouchers</h4>
        </div>
        <p>
          {countForUnpostedVoucher} ({percentageForUnpostedVoucher}%)
        </p>
      </div>

      <CompanyList list={unpostedVoucherList} />
    </section>
  );
};

const PendingTasks = () => {
  if (isSelectedCompanyExist) {
    return (
      <DashboardCardLayout>
        <PendingTasksForCompany />
      </DashboardCardLayout>
    );
  }

  if (isPendingTasksTotalExist) {
    return (
      <DashboardCardLayout>
        <PendingTasksTotal />
      </DashboardCardLayout>
    );
  }

  return (
    <DashboardCardLayout>
      <EmptyPendingTask />
    </DashboardCardLayout>
  );
};

export default PendingTasks;
