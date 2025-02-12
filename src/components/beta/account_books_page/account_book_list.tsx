import { Dispatch, SetStateAction } from 'react';
import AccountBookItem from '@/components/beta/account_books_page/account_book_item';
import { ICompanyAndRole } from '@/interfaces/company';

interface AccountBookListProps {
  accountBookList: ICompanyAndRole[];
  setAccountBookToEdit: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const AccountBookList = ({
  accountBookList,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadPicture,
}: AccountBookListProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      {accountBookList.map((accountBook) => (
        <AccountBookItem
          key={accountBook.company.id}
          accountBook={accountBook}
          setAccountBookToEdit={setAccountBookToEdit}
          setAccountBookToDelete={setAccountBookToDelete}
          setAccountBookToUploadPicture={setAccountBookToUploadPicture}
        />
      ))}
    </section>
  );
};

export default AccountBookList;
