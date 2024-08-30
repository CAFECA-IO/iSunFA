import Image from 'next/image';
import { useTranslation } from 'next-i18next';

// ToDo: (20240614 - Julian) [Beta] replace with actual data
const dummyEmployeeData = [
  {
    name: 'Emily',
    imageId: '/elements/anonymous_avatar.svg',
    workingTimeRatio: 27.5,
    workingHours: 20,
  },
  {
    name: 'Gibbs',
    imageId: '/elements/anonymous_avatar.svg',
    workingTimeRatio: 11.2,
    workingHours: 20,
  },
  {
    name: 'Jacky Fang',
    imageId: '/elements/anonymous_avatar.svg',
    workingTimeRatio: 9.4,
    workingHours: 18,
  },
  {
    name: 'Julian Hsu',
    imageId: '/elements/anonymous_avatar.svg',
    workingTimeRatio: 8,
    workingHours: 16,
  },
  {
    name: 'Liz',
    imageId: '/elements/anonymous_avatar.svg',
    workingTimeRatio: 7.9,
    workingHours: 15,
  },
];

const WorkingTimeRatioBlock = () => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const displayEmployeeList = dummyEmployeeData.map((employee) => {
    return (
      <div
        key={employee.imageId}
        className="flex w-full items-center justify-between px-12px py-8px"
      >
        <div className="flex w-1/2 items-center gap-12px text-sm text-dropdown-text-primary">
          <Image src={employee.imageId} width={32} height={32} alt="employee_avatar" />
          <p>{employee.name}</p>
        </div>
        <p className="justify-self-center text-xs font-normal text-dropdown-text-secondary">
          {employee.workingTimeRatio}%
        </p>
        <p className="justify-self-center text-xs text-dropdown-text-secondary">
          {employee.workingHours} H
        </p>
      </div>
    );
  });

  return (
    <div className="flex h-full flex-col items-center gap-16px rounded-lg bg-surface-neutral-surface-lv2 px-20px py-16px font-medium md:items-stretch md:px-40px md:py-20px">
      {/* Info: (20240614 - Julian) Title */}
      <div className="flex items-center gap-8px">
        <Image
          src="/icons/office_worker.svg"
          width={24}
          height={24}
          alt="working_time_ratio_icon"
        />
        <p className="text-text-neutral-secondary">
          {t('salary:LABOR_COST_CHART.WORKING_TIME_RATIO')}
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-y-8px border-t py-8px">
        {displayEmployeeList}
      </div>
    </div>
  );
};

export default WorkingTimeRatioBlock;
