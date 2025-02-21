import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { IoCloseOutline, IoMailOutline, IoClose } from 'react-icons/io5';
import { TbUserPlus } from 'react-icons/tb';
import { FAKE_EMAIL_LIST } from '@/constants/team';

interface InviteMembersModalProps {
  setIsInviteMembersModalOpen: Dispatch<SetStateAction<boolean>>;
}

const InviteMembersModal = ({ setIsInviteMembersModalOpen }: InviteMembersModalProps) => {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const closeInviteMembersModal = () => {
    setIsInviteMembersModalOpen(false);
  };

  // ToDo: (20250221 - Liz) 打 API 取得 email
  //   const fetchEmails = async (query: string) => {
  //     if (!query) return;
  //     if (isLoading) return;
  //     setIsLoading(true);
  //     try {
  //       const {data} = await fetch(`/api/emails?search=${query}`);
  //       setResults(data);
  //     } catch (error) {
  //       // Deprecated: (20250221 - Liz)
  //       // eslint-disable-next-line no-console
  //       console.error('Error fetching emails:', error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  // Deprecated: (20250221 - Liz) 模擬打 API 取得 email
  const fetchEmails = async (query: string) => {
    if (!query) return;
    if (isLoading) return;
    setIsLoading(true);

    setTimeout(() => {
      const filteredResults = FAKE_EMAIL_LIST.filter((item) =>
        item.toLowerCase().includes(query.toLowerCase())
      );

      // Info: (20250221 - Liz) 移除已經選擇的 email (正式打 api 的時候需要加上這段處理)
      const filteredAvailableResults = filteredResults.filter(
        (item) => !selectedEmails.includes(item)
      );

      setResults(filteredAvailableResults);
      setIsLoading(false);
    }, 500); // 模擬 500ms 延遲
  };

  useEffect(() => {
    if (email.length < 2) {
      setResults([]); // 輸入少於 2 個字時清空結果
      return undefined;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchEmails(email);
    }, 300); // 300ms 防抖

    return () => clearTimeout(delayDebounceFn); // 清除前一次的計時器，確保只執行最新的請求
  }, [email]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md">
        <div className="flex max-h-80vh min-h-50vh w-480px flex-col gap-24px overflow-y-auto bg-surface-neutral-surface-lv1 p-40px">
          {/* Info: (20250220 - Liz) Modal Title */}
          <section className="flex items-center justify-between">
            <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
              Invite Members
            </h1>
            <button type="button" onClick={closeInviteMembersModal}>
              <IoCloseOutline size={24} />
            </button>
          </section>

          <main className="flex flex-auto flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              Member Email
              <span className="text-text-state-error"> *</span>
            </h4>

            <section className="relative">
              <div className="flex items-center overflow-hidden rounded-sm border border-input-stroke-input bg-surface-neutral-surface-lv1 shadow-Dropshadow_SM">
                <div className="px-12px py-10px">
                  <IoMailOutline size={16} />
                </div>

                <input
                  type="email"
                  value={email}
                  placeholder="Enter email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-auto bg-transparent px-12px py-10px text-base font-medium outline-none"
                />
              </div>

              <p
                className={`absolute inset-x-0 top-full text-xs font-medium text-text-state-error ${isLoading ? 'visible' : 'invisible'}`}
              >
                Loading...
              </p>

              {/* Info: (20250220 - Liz) 顯示搜尋結果 */}
              {results.length > 0 && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {results.map((result) => {
                      const selectEmail = () => {
                        setSelectedEmails([...selectedEmails, result]);
                        setEmail('');
                      };

                      return (
                        <button
                          type="button"
                          key={result}
                          onClick={selectEmail}
                          className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                        >
                          {result}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </main>

          {selectedEmails.length > 0 && (
            <section className="flex flex-auto flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">Selected Emails</h4>
              <ul className="flex flex-wrap items-center gap-4px">
                {selectedEmails.map((selectedEmail) => {
                  const removeSelectedEmail = () => {
                    setSelectedEmails(selectedEmails.filter((item) => item !== selectedEmail));
                  };

                  return (
                    <li
                      key={selectedEmail}
                      className="flex items-center gap-1px rounded-xs border border-badge-stroke-secondary p-6px text-badge-text-secondary"
                    >
                      <span className="px-4px text-xs font-medium leading-5">{selectedEmail}</span>
                      <button type="button" onClick={removeSelectedEmail}>
                        <IoClose size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeInviteMembersModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {}}
              disabled={isLoading || selectedEmails.length === 0}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              Invite
              <TbUserPlus size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default InviteMembersModal;
