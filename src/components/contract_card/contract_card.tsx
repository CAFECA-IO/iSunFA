import { IContract } from '@/interfaces/contract';
import { timestampToString } from '@/lib/utils/common';
import { ContractStatus } from '@/constants/contract';

interface IContractCardProps {
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

const ContractCard = ({ contract }: IContractCardProps) => {
  const { contractName, projectName, period, signatory, progress, payment, status } = contract;
  const { price, alreadyPaid } = payment;
  const { contractDuration } = period;

  // ToDo: (20240619 - Julian) temporary abbreviation for project name
  const abbvProjectName = projectName
    .split(' ')
    .map((word) => word[0])
    .join('');

  const contractDurationStart = parseInt(contractDuration.start, 10);
  const contractDurationEnd = parseInt(contractDuration.end, 10);
  const displayContractPeriod = (
    <p className="text-sm font-semibold text-text-neutral-tertiary">
      {timestampToString(contractDurationStart).date} to{' '}
      <span
        className={status === 'Expired' ? 'text-text-state-error' : 'text-text-neutral-tertiary'}
      >
        {timestampToString(contractDurationEnd).date}
      </span>
    </p>
  );

  const paymentStr = `Payment: $ ${alreadyPaid}/${price}`;
  const paymentPercentage = (alreadyPaid / price) * 100;

  const progressStr = `Progress: ${progress}%`;
  const statusStr = status === ContractStatus.VALID ? 'In Process' : status;

  const statusMainColor = StatusMainColorMap[status as ContractStatus];

  return (
    <div className="relative flex flex-col items-stretch gap-26px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-16px py-24px md:px-40px">
      <div className="grid grid-cols-1 items-center justify-items-center gap-y-8px md:grid-cols-3 md:justify-items-start">
        {/* Info: (20240619 - Julian) Contract name */}
        <div className="flex items-center gap-x-8px">
          <p className="text-lg font-semibold text-text-brand-secondary-lv2 md:text-2xl">
            {contractName}
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
          <p className="text-text-neutral-tertiary">Signatory</p>
          <p className="font-semibold text-text-neutral-primary">{signatory}</p>
        </div>
      </div>
      {/* Info: (20240619 - Julian) Progress bars */}
      <div className="flex flex-col gap-y-12px">
        <div className="relative flex h-20px w-full items-center overflow-hidden rounded-xs bg-surface-neutral-mute">
          <div
            className={`absolute h-full ${statusMainColor.progressBar}`}
            style={{ width: `${paymentPercentage}%` }}
          ></div>
          <p className={`absolute w-full text-center text-xs ${statusMainColor.text}`}>
            {paymentStr}
          </p>
        </div>

        <div className="relative flex h-20px w-full items-center justify-end overflow-hidden rounded-xs bg-surface-neutral-mute">
          <div
            className={`absolute h-full ${statusMainColor.progressBar}`}
            style={{ width: `${progress}%` }}
          ></div>
          <p className={`absolute w-full text-center text-xs ${statusMainColor.text}`}>
            {progressStr}
          </p>
        </div>
      </div>

      {/* Info: (2024619 - Julian) Status */}
      <div
        className={`absolute -right-4 hidden rounded-xs py-4px pl-12px pr-28px text-xs text-badge-text-invert md:block ${statusMainColor.mainBg}`}
      >
        {statusStr}
      </div>
    </div>
  );
};

export default ContractCard;
