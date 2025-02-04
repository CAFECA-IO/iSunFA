import { Dispatch, SetStateAction } from 'react';
import AccountBookItem from '@/components/beta/account_books_page/account_book_item';
import { ICompanyAndRole } from '@/interfaces/company';

interface AccountBookListProps {
  accountBookList: ICompanyAndRole[];
  setAccountBookToEdit: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setAccountBookToUploadAvatar: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const AccountBookList = ({
  accountBookList,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadAvatar,
}: AccountBookListProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      {accountBookList.map((accountBook) => (
        <AccountBookItem
          key={accountBook.company.id}
          accountBook={accountBook}
          setAccountBookToEdit={setAccountBookToEdit}
          setAccountBookToDelete={setAccountBookToDelete}
          setAccountBookToUploadAvatar={setAccountBookToUploadAvatar}
        />
      ))}
    </section>
  );
};

export default AccountBookList;
