import { ContractStatus } from '@/constants/contract';
import { IContract } from '@/interfaces/contract';
import { Layout } from '@/constants/layout';
import ContractCard from '@/components/contract_card/contract_card';

interface IContractStatusBlockProps {
  status: ContractStatus;
  contracts: IContract[];
}

const ContractStatusBlock = ({ status, contracts }: IContractStatusBlockProps) => {
  const contractList = contracts.filter((contract) => contract.status === status);

  return (
    <div className="flex w-full flex-col gap-8px rounded-sm bg-surface-neutral-surface-lv2 px-20px py-24px">
      <h2 className="text-xl font-semibold text-text-neutral-tertiary">{status}</h2>
      <hr className="my-10px bg-divider-stroke-lv-4" />
      <div className="flex w-full items-center gap-10px overflow-x-auto scroll-smooth">
        {contractList.map((contract) => (
          <ContractCard key={contract.contractId} style={Layout.GRID} contract={contract} />
        ))}
      </div>
    </div>
  );
};

export default ContractStatusBlock;
