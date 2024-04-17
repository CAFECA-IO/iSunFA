import Image from 'next/image';
import { useState } from 'react';
import { FiBookOpen } from 'react-icons/fi';

const AccountingSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  return (
    <div
      onMouseEnter={sidebarEnterHandler}
      onMouseLeave={sidebarLeaveHandler}
      className={`fixed flex h-screen flex-col items-center font-semibold text-navyBlue2 ${isExpanded ? 'w-200px' : 'w-70px'} bg-white px-12px py-40px transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Main icon */}
      <div className="flex flex-col items-center">
        <Image
          src={'/icons/calculator.svg'}
          width={30}
          height={30}
          alt="calculator_icon"
          className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
        />
        <p
          className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-8px text-sm transition-all duration-300 ease-in-out`}
        >
          Accounting
        </p>
      </div>

      {/* Info: (20240416 - Julian) Divider */}
      <div
        className={`${isExpanded ? 'h-40px' : 'h-20px'} w-full border-b border-lightGray6 transition-all duration-300 ease-in-out`}
      ></div>

      {/* Info: (20240416 - Julian) Menu */}
      <div className="flex flex-col items-center py-16px">
        <button type="button" className="flex items-center p-8px">
          <FiBookOpen size={20} />
          <p
            className={`${isExpanded ? 'w-65px' : 'w-0'} overflow-hidden pl-8px transition-all duration-300 ease-in-out`}
          >
            Journal
          </p>
        </button>
      </div>
    </div>
  );
};

export default AccountingSidebar;
