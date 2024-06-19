import { IContract } from '@/interfaces/contract';
import { timestampToString } from '@/lib/utils/common';

interface IContractCardProps {
  contract: IContract;
}

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

  const progressBarStyle =
    status === 'Expired' ? 'bg-surface-state-error-soft' : 'bg-surface-brand-secondary-moderate';
  const strStyle = status === 'Expired' ? 'text-text-state-error' : 'text-text-neutral-primary';

  const statusStyle = status === 'Expired' ? 'bg-badge-stroke-error' : 'bg-surface-brand-secondary';

  return (
    <div className="relative flex flex-col gap-26px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-40px py-24px">
      <div className="grid grid-cols-3 items-center">
        {/* Info: (20240619 - Julian) Contract name */}
        <div className="flex items-center gap-x-8px">
          <p className="text-2xl font-semibold text-text-brand-secondary-lv2">{contractName}</p>
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
            className={`absolute h-full ${progressBarStyle}`}
            style={{ width: `${paymentPercentage}%` }}
          ></div>
          <p className={`absolute w-full text-center text-xs ${strStyle}`}>{paymentStr}</p>
        </div>

        <div className="relative flex h-20px w-full items-center overflow-hidden rounded-xs bg-surface-neutral-mute">
          <div
            className={`absolute h-full ${progressBarStyle}`}
            style={{ width: `${progress}%` }}
          ></div>
          <p className={`absolute w-full text-center text-xs ${strStyle}`}>{progressStr}</p>
        </div>
      </div>

      {/* Info: (2024619 - Julian) Status */}
      <div
        className={`absolute -right-4 rounded-xs py-4px pl-12px pr-28px text-xs text-badge-text-invert ${statusStyle}`}
      >
        {status}
      </div>
    </div>
  );
};

export default ContractCard;
