import { IContract } from '@/interfaces/contract';
import { timestampToString } from '@/lib/utils/common';
import { ContractStatus } from '@/constants/contract';
import { Layout } from '@/constants/layout';
import { useTranslation } from 'next-i18next';

interface IContractCardProps {
  style: Layout;
  contract: IContract;
}

const StatusMainColorMap = {
  [ContractStatus.VALID]: {
    mainBg: 'bg-surface-brand-secondary',
    text: 'text-text-neutral-primary',
    progressBar: 'bg-surface-brand-secondary-moderate',
  },
  [ContractStatus.EXPIRED]: {
    mainBg: 'bg-badge-stroke-error',
    text: 'text-text-state-error',
    progressBar: 'bg-surface-state-error-soft',
  },
  [ContractStatus.COMPLETED]: {
    mainBg: 'bg-surface-state-success',
    text: 'text-text-state-success-solid',
    progressBar: 'bg-surface-state-success-soft',
  },
  [ContractStatus.IN_WARRANTY]: {
    mainBg: 'bg-surface-support-strong-taro',
    text: 'text-text-support-taro',
    progressBar: 'bg-surface-support-strong-taro',
  },
};

const ContractCard = ({ style, contract }: IContractCardProps) => {
  const { t } = useTranslation('common');
  const {
    name,
    projectName,
    contractStartDate,
    contractEndDate,
    signatory,
    progress,
    payment,
    status,
  } = contract;
  const { price, alreadyPaid } = payment;

  // ToDo: (20240619 - Julian) temporary abbreviation for project name
  const abbvProjectName = projectName
    .split(' ')
    .map((word) => word[0])
    .join('');

  const durationColor =
    status === 'Expired' ? 'text-text-state-error' : 'text-text-neutral-tertiary';

  const contractStartStr = timestampToString(contractStartDate).date;
  const contractEndStr = timestampToString(contractEndDate).date;

  const displayContractPeriod = (
    <p className="text-sm font-semibold text-text-neutral-tertiary">
      {contractStartStr} {t('DATE_PICKER.TO')}{' '}
      <span className={`${durationColor}`}>{contractEndStr}</span>
    </p>
  );

  const paymentStr = `Payment: $ ${alreadyPaid}/${price}`;
  const paymentPercentage = (alreadyPaid / price) * 100;

  const progressStr = `Progress: ${progress}%`;
  const statusStr = status === ContractStatus.VALID ? 'In Process' : status;

  const statusMainColor = StatusMainColorMap[status as ContractStatus];

  const paymentBar = (
    <div className="relative flex h-20px w-full items-center overflow-hidden rounded-xs bg-surface-neutral-mute">
      <div
        className={`absolute h-full ${statusMainColor.progressBar}`}
        style={{ width: `${paymentPercentage}%` }}
      ></div>
      <p className={`absolute w-full text-center text-xs ${statusMainColor.text}`}>{paymentStr}</p>
    </div>
  );

  const progressBar = (
    <div className="relative flex h-20px w-full items-center justify-end overflow-hidden rounded-xs bg-surface-neutral-mute">
      <div
        className={`absolute h-full ${statusMainColor.progressBar}`}
        style={{ width: `${progress}%` }}
      ></div>
      <p className={`absolute w-full text-center text-xs ${statusMainColor.text}`}>{progressStr}</p>
    </div>
  );

  if (style === Layout.LIST) {
    // Info: (20240620 - Julian) Contract card layout for list
    return (
      <div className="relative flex flex-col items-stretch gap-26px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-16px py-24px md:px-40px">
        <div className="grid grid-cols-1 items-center justify-items-center gap-y-8px md:grid-cols-3 md:justify-items-start">
          {/* Info: (20240619 - Julian) Contract name */}
          <div className="flex items-center gap-x-8px">
            <p className="text-lg font-semibold text-text-brand-secondary-lv2 md:text-2xl">
              {name}
            </p>
            {/* Info: (20240619 - Julian) Project name */}
            <div className="flex items-center gap-4px rounded-xs bg-badge-surface-soft-primary px-6px py-4px">
              <div className="flex h-14px w-14px items-center justify-center rounded-full bg-avatar-surface-background-indigo text-xxs text-avatar-text-in-dark-background">
                {abbvProjectName}
              </div>
              <p className="text-xs text-badge-text-primary-solid">{projectName}</p>
            </div>
          </div>
          {/* Info: (20240619 - Julian) Contract period */}
          {displayContractPeriod}
          {/* Info: (20240619 - Julian) Signatory */}
          <div className="flex items-center gap-x-8px text-sm">
            <p className="text-text-neutral-tertiary">{t('CONTRACT.SIGNATORY')}</p>
            <p className="font-semibold text-text-neutral-primary">{signatory}</p>
          </div>
        </div>
        {/* Info: (20240619 - Julian) Progress bars */}
        <div className="flex flex-col gap-y-12px">
          {paymentBar}
          {progressBar}
        </div>

        {/* Info: (2024619 - Julian) Status */}
        <div
          className={`absolute -right-4 hidden rounded-xs py-4px pl-12px pr-28px text-xs text-badge-text-invert md:block ${statusMainColor.mainBg}`}
        >
          {statusStr}
        </div>
      </div>
    );
  } else {
    // Info: (20240620 - Julian) Contract card layout for grid
    return (
      <div className="flex flex-col gap-y-8px">
        {/* Info: (20240620 - Julian) Card */}
        <div className="flex w-180px flex-none flex-col items-stretch overflow-hidden rounded-sm border border-stroke-neutral-quaternary">
          {/* Info: (20240620 - Julian) Header */}
          <div
            className={`${statusMainColor.mainBg} flex h-22px items-center justify-center text-xs text-badge-text-invert`}
          >
            {statusStr}
          </div>
          {/* Info: (20240620 - Julian) Content */}
          <div className="flex flex-col items-center gap-y-10px px-16px py-12px">
            <p className="text-xl font-semibold text-text-brand-secondary-lv2">{name}</p>
            <div className="flex h-24px w-24px items-center justify-center rounded-full bg-avatar-surface-background-indigo text-sm font-bold text-avatar-text-in-dark-background">
              {abbvProjectName}
            </div>
            <p className="text-sm text-text-neutral-tertiary">{signatory}</p>
          </div>
          {/* Info: (20240620 - Julian) Progress bars */}
          <div className="flex flex-col gap-y-12px">
            {paymentBar}
            {progressBar}
          </div>
        </div>
        {/* Info: (20240620 - Julian) Duration */}
        <div className="flex flex-col gap-y-8px">
          <p className="text-xs text-text-neutral-tertiary">{t('CONTRACT.DURATION')}</p>
          <p className="text-xs text-text-neutral-tertiary">
            {contractStartStr} {t('DATE_PICKER.TO')}{' '}
            <span className={`${durationColor}`}>{contractEndStr}</span>
          </p>
        </div>
      </div>
    );
  }
};

export default ContractCard;
