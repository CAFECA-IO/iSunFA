import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import AccountBookItem from '@/components/beta/account_books_page/account_book_item';
import { IAccountBookWithTeam } from '@/interfaces/account_book';

interface AccountBookListProps {
  accountBookList: IAccountBookWithTeam[];
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToChangeName: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  shouldGroupByTeam?: boolean;
}

const AccountBookList = ({
  accountBookList,
  setAccountBookToTransfer,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadPicture,
  setAccountBookToChangeName,
  setRefreshKey,
  shouldGroupByTeam = false, // Info: (20250227 - Liz) 預設不把帳本依照 team 分組
}: AccountBookListProps) => {
  const groupedByTeam = shouldGroupByTeam
    ? accountBookList.reduce<
        Record<string, { teamName: string; accountBooks: IAccountBookWithTeam[] }>
      >((acc, accountBook) => {
        const teamId = accountBook.team.id;
        const teamNameValue = accountBook.team.name.value;

        if (!acc[teamId]) {
          acc[teamId] = { teamName: teamNameValue, accountBooks: [] }; // Info: (20250227 - Liz) 如果該 team 尚未出現過，則新增一個物件，並設定 teamName 和 accountBooks，且 accountBooks 是一個空陣列
        }

        acc[teamId].accountBooks.push(accountBook); // Info: (20250227 - Liz) 將 accountBook 加入到對應的 team 的 accountBooks 陣列中
        return acc; // Info: (20250227 - Liz) 回傳累積的物件
      }, {}) // Info: (20250227 - Liz) 初始值是一個空物件
    : { all: { teamName: '', accountBooks: accountBookList } }; // Info: (20250227 - Liz) 不需要分組的情況用 key 'all' 讓結構保持一致

  return (
    <main className="flex flex-auto flex-col gap-40px">
      {Object.entries(groupedByTeam).map(([teamId, { teamName, accountBooks }]) => (
        <section key={teamId} className="flex flex-auto flex-col gap-40px">
          {shouldGroupByTeam && (
            <div className="flex items-center gap-16px">
              <h2 className="flex items-center gap-8px text-sm font-medium text-divider-text-lv-1">
                <Image src="/icons/team_icon.svg" alt="team icon" width={24} height={24} />
                {teamName}
              </h2>
              <hr className="flex-auto border-divider-stroke-lv-1"></hr>
            </div>
          )}

          <div className="flex flex-auto flex-col gap-8px">
            {accountBooks.map((accountBook) => (
              <AccountBookItem
                key={accountBook.id}
                accountBook={accountBook}
                setAccountBookToTransfer={setAccountBookToTransfer}
                setAccountBookToEdit={setAccountBookToEdit}
                setAccountBookToDelete={setAccountBookToDelete}
                setAccountBookToUploadPicture={setAccountBookToUploadPicture}
                setAccountBookToChangeName={setAccountBookToChangeName}
                setRefreshKey={setRefreshKey}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
};

export default AccountBookList;
