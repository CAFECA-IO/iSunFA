import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import AccountBookItem from '@/components/beta/account_books_page/account_book_item';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';

interface AccountBookListProps {
  accountBookList: IAccountBookForUserWithTeam[];
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
}

const AccountBookList = ({
  accountBookList,
  setAccountBookToTransfer,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadPicture,
}: AccountBookListProps) => {
  const groupedByTeam = accountBookList.reduce<
    Record<string, { teamName: string; accountBooks: IAccountBookForUserWithTeam[] }>
  >((acc, accountBook) => {
    const teamId = accountBook.team.id;
    const teamNameValue = accountBook.team.name.value;

    if (!acc[teamId]) {
      acc[teamId] = { teamName: teamNameValue, accountBooks: [] }; // Info: (20250227 - Liz) 如果該 team 尚未出現過，則新增一個物件，並設定 teamName 和 accountBooks，且 accountBooks 是一個空陣列
    }

    acc[teamId].accountBooks.push(accountBook); // Info: (20250227 - Liz) 將 accountBook 加入到對應的 team 的 accountBooks 陣列中
    return acc; // Info: (20250227 - Liz) 回傳累積的物件
  }, {}); // Info: (20250227 - Liz) 初始值是一個空物件

  return (
    <main className="flex flex-auto flex-col gap-40px">
      {Object.entries(groupedByTeam).map(([teamId, { teamName, accountBooks }]) => (
        <section key={teamId} className="flex flex-auto flex-col gap-40px">
          <div className="flex items-center gap-16px">
            <h2 className="flex items-center gap-8px text-sm font-medium text-divider-text-lv-1">
              <Image src="/icons/team_icon.svg" alt="team icon" width={24} height={24} />
              {teamName}
            </h2>
            <hr className="flex-auto border-divider-stroke-lv-1"></hr>
          </div>

          <div className="flex flex-auto flex-col gap-8px">
            {accountBooks.map((accountBook) => (
              <AccountBookItem
                key={accountBook.company.id}
                accountBook={accountBook}
                setAccountBookToTransfer={setAccountBookToTransfer}
                setAccountBookToEdit={setAccountBookToEdit}
                setAccountBookToDelete={setAccountBookToDelete}
                setAccountBookToUploadPicture={setAccountBookToUploadPicture}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
};

export default AccountBookList;
