import { Dispatch, SetStateAction } from 'react';
import AccountBookItem from '@/components/beta/account_books_page/account_book_item';
import { IAccountBookForUser } from '@/interfaces/company';

interface AccountBookListProps {
  accountBookList: IAccountBookForUser[];
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
}

const AccountBookList = ({
  accountBookList,
  setAccountBookToTransfer,
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
          setAccountBookToTransfer={setAccountBookToTransfer}
          setAccountBookToEdit={setAccountBookToEdit}
          setAccountBookToDelete={setAccountBookToDelete}
          setAccountBookToUploadPicture={setAccountBookToUploadPicture}
        />
      ))}
    </section>
  );
};

export default AccountBookList;
