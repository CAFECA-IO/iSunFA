import Image from 'next/image';
import { useState, Dispatch, SetStateAction } from 'react';
import { FiBookOpen } from 'react-icons/fi';
import { IoIosList } from 'react-icons/io';

interface IAccountingSidebarProps {
  setCurrentTab: Dispatch<SetStateAction<'journal' | 'journal_list' | 'subpoena_list'>>;
}

const AccountingSidebar = ({ setCurrentTab }: IAccountingSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  const journalTabClickHandler = () => setCurrentTab('journal');
  const journalListTabClickHandler = () => setCurrentTab('journal_list');

  return (
    <div
      onMouseEnter={sidebarEnterHandler}
      onMouseLeave={sidebarLeaveHandler}
      className={`fixed z-10 flex h-screen flex-col items-center font-semibold ${isExpanded ? 'w-200px' : 'w-70px'} bg-white px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Main icon */}
      <div className="flex flex-col items-center pt-20px">
        <Image
          src={'/icons/calculator.svg'}
          width={30}
          height={30}
          alt="calculator_icon"
          className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
        />
        <p
          className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm text-secondaryBlue transition-all duration-300 ease-in-out`}
        >
          Accounting
        </p>
      </div>

      {/* Info: (20240416 - Julian) Divider */}
      <div
        className={`${isExpanded ? 'h-40px' : 'h-20px'} w-full border-b border-lightGray6 transition-all duration-300 ease-in-out`}
      ></div>

      {/* Info: (20240416 - Julian) Menu */}
      <div className="flex w-full flex-col items-start py-16px">
        <button
          type="button"
          onClick={journalTabClickHandler}
          className="flex w-full items-center gap-8px p-8px text-secondaryBlue hover:text-primaryYellow"
        >
          <FiBookOpen size={20} className="transition-all duration-300 ease-in-out" />
          <p
            className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
          >
            Journal
          </p>
        </button>
        <button
          type="button"
          onClick={journalListTabClickHandler}
          className="flex w-full items-center gap-8px p-8px text-secondaryBlue hover:text-primaryYellow"
        >
          <IoIosList size={20} className="transition-all duration-300 ease-in-out" />
          <p
            className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
          >
            Journal list
          </p>
        </button>
      </div>
    </div>
  );
};

export default AccountingSidebar;
