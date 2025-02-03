import { Dispatch, SetStateAction } from 'react';
import CompanyItem from '@/components/beta/account_books_page/company_item';
import { ICompanyAndRole } from '@/interfaces/company';

interface AccountBookListProps {
  companyList: ICompanyAndRole[];
  setCompanyToEdit: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setCompanyToDelete: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setCompanyToUploadAvatar: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const AccountBookList = ({
  companyList,
  setCompanyToEdit,
  setCompanyToDelete,
  setCompanyToUploadAvatar,
}: AccountBookListProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      {companyList.map((myCompany) => (
        <CompanyItem
          key={myCompany.company.id}
          myCompany={myCompany}
          setCompanyToEdit={setCompanyToEdit}
          setCompanyToDelete={setCompanyToDelete}
          setCompanyToUploadAvatar={setCompanyToUploadAvatar}
        />
      ))}
    </section>
  );
};

export default AccountBookList;
