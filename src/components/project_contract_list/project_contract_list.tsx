import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { IContract } from '@/interfaces/contract';
import ContractCard from '@/components/contract_card/contract_card';
import Pagination from '@/components/pagination/pagination';
import { Layout } from '@/constants/layout';
import { useTranslation } from 'next-i18next';

interface IProjectContractListProps {
  contracts: IContract[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}

const ProjectContractList = ({
  contracts,
  currentPage,
  setCurrentPage,
  totalPages,
}: IProjectContractListProps) => {
  const { t } = useTranslation('common');
  const displayedContractList =
    contracts.length > 0 ? (
      <div className="flex w-full flex-col gap-20px">
        {contracts.map((contract) => (
          <ContractCard key={contract.id} style={Layout.LIST} contract={contract} />
        ))}
        <div className="mx-auto mt-50px">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    ) : (
      <div className="flex h-400px w-full flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>{t('MY_REPORTS_SECTION.EMPTY')}</p>
      </div>
    );

  return displayedContractList;
};

export default ProjectContractList;
