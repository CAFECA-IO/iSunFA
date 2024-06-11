import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { FiSettings } from 'react-icons/fi';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';

interface IProjectDetailPageProps {
  projectId: string;
}

const ProjectSidebar = ({ projectId }: IProjectDetailPageProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  const { pathname } = useRouter();

  const inDashboard = pathname.includes('dashboard');
  const inContract = pathname.includes('contract');
  const inJournal = pathname.includes('journal');
  const inReport = pathname.includes('report');
  const inSetting = pathname.includes('setting');

  const { selectedCompany } = useUserCtx();
  const companyName = selectedCompany?.name;

  const displayedCompanyName = companyName ? (
    <Link
      href={ISUNFA_ROUTE.SELECT_COMPANY}
      className={`my-20px flex ${isExpanded ? 'h-60px w-60px text-3xl' : 'h-40px w-40px text-2xl'} items-center justify-center rounded-full bg-avatar-surface-background-indigo font-bold text-avatar-text-in-dark-background transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240423 - Julian) Display company name's first letter */}
      {companyName.charAt(0)}
    </Link>
  ) : null;

  return (
    <>
      {/* Info: (20240423 - Julian) Desktop */}
      <div
        onMouseEnter={sidebarEnterHandler}
        onMouseLeave={sidebarLeaveHandler}
        className={`fixed z-10 hidden h-screen flex-col items-center font-semibold md:flex ${isExpanded ? 'w-240px' : 'w-70px'} bg-white px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
      >
        {/* Info: (20240416 - Julian) Main icon */}
        <div className="flex flex-col items-center pt-20px">
          <Image
            src={'/icons/rocket_launch.svg'}
            width={30}
            height={30}
            alt="calculator_icon"
            className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
          />
          <p
            className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm text-secondaryBlue transition-all duration-300 ease-in-out`}
          >
            Project
          </p>

          {displayedCompanyName}
        </div>

        {/* Info: (20240423 - Julian) Menu */}
        <div className="my-16px flex w-full flex-col items-center text-lg">
          {/* Info: (20240416 - Julian) Divider */}
          <hr
            className={`${isExpanded ? 'w-full' : 'w-56px'} my-20px border border-lightGray6 transition-all duration-300 ease-in-out`}
          />
          {/* Info: (20240611 - Julian) Dashboard */}
          <Link
            href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/dashboard`}
            className={`flex w-full items-center gap-8px p-8px ${inDashboard ? 'text-primaryYellow' : 'text-secondaryBlue'} hover:text-primaryYellow`}
          >
            <div className="h-20px w-20px">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 20 20"
              >
                <g>
                  <path
                    className={`fill-current`}
                    fillRule="evenodd"
                    d="M6.462 1.501h7.08c.667 0 1.226 0 1.684.037.479.04.934.125 1.365.345a3.5 3.5 0 011.53 1.53l-.891.453.891-.454c.22.432.305.887.344 1.366.038.458.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.684-.04.478-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.305-1.365.344-.458.037-1.018.037-1.683.037h-7.08c-.667 0-1.226 0-1.684-.037-.479-.04-.934-.124-1.366-.344l.454-.891-.454.89a3.5 3.5 0 01-1.53-1.529c-.22-.432-.304-.887-.343-1.365-.038-.458-.038-1.018-.038-1.684v-7.08c0-.666 0-1.225.038-1.683.039-.479.124-.934.344-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.304 1.365-.344.458-.037 1.017-.037 1.683-.037zm-2.96 7v5c0 .717.001 1.194.031 1.56.03.356.08.518.133.621a1.5 1.5 0 00.655.656c.103.052.266.103.62.132.368.03.845.031 1.561.031v-8h-3zm4-2h-4c0-.716.001-1.194.031-1.56.03-.356.08-.518.133-.62a1.5 1.5 0 01.655-.656c.103-.053.266-.104.62-.133.368-.03.845-.03 1.561-.03h7c.717 0 1.194 0 1.561.03.355.029.518.08.62.133a1.5 1.5 0 01.656.655c.052.103.104.265.133.62.03.367.03.845.03 1.561h-9zm1 2v8h5c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.133a1.5 1.5 0 00.656-.656c.052-.103.104-.265.133-.62.03-.367.03-.844.03-1.56v-5h-8z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </div>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left`}
            >
              Dashboard
            </p>
          </Link>
          {/* Info: (20240611 - Julian) Contract List */}
          <Link
            href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/contract`}
            className={`flex w-full items-center gap-8px p-8px ${inContract ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
          >
            <div className="h-20px w-20px">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_3554_65690)">
                  <path
                    d="M17.5 14.9995L16.6666 15.9112C16.2245 16.3946 15.6251 16.6662 15.0001 16.6662C14.3751 16.6662 13.7757 16.3946 13.3337 15.9112C12.891 15.4288 12.2916 15.1579 11.6668 15.1579C11.042 15.1579 10.4426 15.4288 9.99998 15.9112M2.5 16.6662H3.89545C4.3031 16.6662 4.50693 16.6662 4.69874 16.6202C4.8688 16.5793 5.03138 16.512 5.1805 16.4206C5.34869 16.3175 5.49282 16.1734 5.78107 15.8852L16.25 5.4162C16.9404 4.72585 16.9404 3.60656 16.25 2.9162C15.5597 2.22585 14.4404 2.22585 13.75 2.9162L3.28105 13.3852C2.9928 13.6734 2.84867 13.8175 2.7456 13.9857C2.65422 14.1348 2.58688 14.2974 2.54605 14.4675C2.5 14.6593 2.5 14.8631 2.5 15.2708V16.6662Z"
                    stroke="fill-current"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left`}
            >
              Contract List
            </p>
          </Link>
          {/* Info: (20240611 - Julian) Accounting Journal */}
          <Link
            href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/journal`}
            className={`flex w-full items-center gap-8px p-8px ${inJournal ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
          >
            <div className="h-20px w-20px">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.5833 5.41667L5.41667 14.5833M7.08333 8.75V5.41667M5.41667 7.08333H8.75M11.25 12.9167H14.5833M6.5 17.5H13.5C14.9001 17.5 15.6002 17.5 16.135 17.2275C16.6054 16.9878 16.9878 16.6054 17.2275 16.135C17.5 15.6002 17.5 14.9001 17.5 13.5V6.5C17.5 5.09987 17.5 4.3998 17.2275 3.86502C16.9878 3.39462 16.6054 3.01217 16.135 2.77248C15.6002 2.5 14.9001 2.5 13.5 2.5H6.5C5.09987 2.5 4.3998 2.5 3.86502 2.77248C3.39462 3.01217 3.01217 3.39462 2.77248 3.86502C2.5 4.3998 2.5 5.09987 2.5 6.5V13.5C2.5 14.9001 2.5 15.6002 2.77248 16.135C3.01217 16.6054 3.39462 16.9878 3.86502 17.2275C4.3998 17.5 5.09987 17.5 6.5 17.5Z"
                  stroke="fill-current"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left`}
            >
              Accounting Journal
            </p>
          </Link>
          {/* Info: (20240611 - Julian) Analysis Reports */}
          <Link
            href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/report`}
            className={`flex w-full items-center gap-8px p-8px ${inReport ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
          >
            <div className="h-20px w-20px">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_3554_65708)">
                  <path
                    d="M11.6668 1.8916V5.33372C11.6668 5.80043 11.6668 6.03378 11.7577 6.21204C11.8376 6.36885 11.965 6.49633 12.1218 6.57622C12.3001 6.66705 12.5335 6.66705 13.0002 6.66705H16.4423M6.66683 12.5003V15.0003M13.3335 10.8337V15.0003M10.0002 8.75033V15.0003M16.6668 8.32385V14.3337C16.6668 15.7338 16.6668 16.4339 16.3943 16.9686C16.1547 17.439 15.7722 17.8215 15.3018 18.0612C14.767 18.3337 14.067 18.3337 12.6668 18.3337H7.3335C5.93336 18.3337 5.2333 18.3337 4.69852 18.0612C4.22811 17.8215 3.84566 17.439 3.60598 16.9686C3.3335 16.4339 3.3335 15.7338 3.3335 14.3337V5.66699C3.3335 4.26686 3.3335 3.5668 3.60598 3.03202C3.84566 2.56161 4.22811 2.17916 4.69852 1.93948C5.2333 1.66699 5.93336 1.66699 7.3335 1.66699H10.01C10.6215 1.66699 10.9272 1.66699 11.2149 1.73607C11.47 1.79731 11.7139 1.89832 11.9375 2.03539C12.1898 2.19 12.406 2.40619 12.8384 2.83857L15.4953 5.49542C15.9276 5.9278 16.1438 6.14399 16.2984 6.39628C16.4355 6.61996 16.5365 6.86382 16.5978 7.11891C16.6668 7.40663 16.6668 7.71237 16.6668 8.32385Z"
                    stroke="fill-current"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left`}
            >
              Analysis Reports
            </p>
          </Link>
          {/* Info: (20240611 - Julian) Divider */}
          <hr
            className={`${isExpanded ? 'w-full' : 'w-56px'} my-20px border border-lightGray6 transition-all duration-300 ease-in-out`}
          />
          {/* Info: (20240611 - Julian) Project Setting */}
          <Link
            href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/setting`}
            className={`flex w-full items-center gap-8px p-8px ${inSetting ? 'text-primaryYellow' : 'text-secondaryBlue'} hover:text-primaryYellow`}
          >
            <div className="h-20px w-20px">
              <FiSettings size={20} />
            </div>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left`}
            >
              Project Setting
            </p>
          </Link>
        </div>
      </div>

      {/* Info: (20240423 - Julian) Mobile */}
      <div className="fixed bottom-0 z-10 grid h-72px w-screen grid-cols-5 items-center bg-white px-16px py-8px shadow-sidebarMobile md:hidden">
        {/* Info: (20240423 - Julian) Dashboard */}
        <Link
          href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/dashboard`}
          className={`mx-auto p-8px ${inDashboard ? 'text-primaryYellow' : 'text-secondaryBlue'} hover:text-primaryYellow`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g>
              <path
                className={`fill-current`}
                fillRule="evenodd"
                d="M6.462 1.501h7.08c.667 0 1.226 0 1.684.037.479.04.934.125 1.365.345a3.5 3.5 0 011.53 1.53l-.891.453.891-.454c.22.432.305.887.344 1.366.038.458.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.684-.04.478-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.305-1.365.344-.458.037-1.018.037-1.683.037h-7.08c-.667 0-1.226 0-1.684-.037-.479-.04-.934-.124-1.366-.344l.454-.891-.454.89a3.5 3.5 0 01-1.53-1.529c-.22-.432-.304-.887-.343-1.365-.038-.458-.038-1.018-.038-1.684v-7.08c0-.666 0-1.225.038-1.683.039-.479.124-.934.344-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.304 1.365-.344.458-.037 1.017-.037 1.683-.037zm-2.96 7v5c0 .717.001 1.194.031 1.56.03.356.08.518.133.621a1.5 1.5 0 00.655.656c.103.052.266.103.62.132.368.03.845.031 1.561.031v-8h-3zm4-2h-4c0-.716.001-1.194.031-1.56.03-.356.08-.518.133-.62a1.5 1.5 0 01.655-.656c.103-.053.266-.104.62-.133.368-.03.845-.03 1.561-.03h7c.717 0 1.194 0 1.561.03.355.029.518.08.62.133a1.5 1.5 0 01.656.655c.052.103.104.265.133.62.03.367.03.845.03 1.561h-9zm1 2v8h5c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.133a1.5 1.5 0 00.656-.656c.052-.103.104-.265.133-.62.03-.367.03-.844.03-1.56v-5h-8z"
                clipRule="evenodd"
              ></path>
            </g>
          </svg>
        </Link>
        {/* Info: (20240423 - Julian) Contract List */}
        <Link
          href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/contract`}
          className={`mx-auto p-8px ${inContract ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_3554_65690)">
              <path
                d="M17.5 14.9995L16.6666 15.9112C16.2245 16.3946 15.6251 16.6662 15.0001 16.6662C14.3751 16.6662 13.7757 16.3946 13.3337 15.9112C12.891 15.4288 12.2916 15.1579 11.6668 15.1579C11.042 15.1579 10.4426 15.4288 9.99998 15.9112M2.5 16.6662H3.89545C4.3031 16.6662 4.50693 16.6662 4.69874 16.6202C4.8688 16.5793 5.03138 16.512 5.1805 16.4206C5.34869 16.3175 5.49282 16.1734 5.78107 15.8852L16.25 5.4162C16.9404 4.72585 16.9404 3.60656 16.25 2.9162C15.5597 2.22585 14.4404 2.22585 13.75 2.9162L3.28105 13.3852C2.9928 13.6734 2.84867 13.8175 2.7456 13.9857C2.65422 14.1348 2.58688 14.2974 2.54605 14.4675C2.5 14.6593 2.5 14.8631 2.5 15.2708V16.6662Z"
                stroke="fill-current"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </Link>
        {/* Info: (20240611 - Julian) Accounting Journal */}
        <Link
          href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/journal`}
          className={`mx-auto p-8px ${inJournal ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.5833 5.41667L5.41667 14.5833M7.08333 8.75V5.41667M5.41667 7.08333H8.75M11.25 12.9167H14.5833M6.5 17.5H13.5C14.9001 17.5 15.6002 17.5 16.135 17.2275C16.6054 16.9878 16.9878 16.6054 17.2275 16.135C17.5 15.6002 17.5 14.9001 17.5 13.5V6.5C17.5 5.09987 17.5 4.3998 17.2275 3.86502C16.9878 3.39462 16.6054 3.01217 16.135 2.77248C15.6002 2.5 14.9001 2.5 13.5 2.5H6.5C5.09987 2.5 4.3998 2.5 3.86502 2.77248C3.39462 3.01217 3.01217 3.39462 2.77248 3.86502C2.5 4.3998 2.5 5.09987 2.5 6.5V13.5C2.5 14.9001 2.5 15.6002 2.77248 16.135C3.01217 16.6054 3.39462 16.9878 3.86502 17.2275C4.3998 17.5 5.09987 17.5 6.5 17.5Z"
              stroke="fill-current"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {/* Info: (20240611 - Julian) Analysis Reports */}
        <Link
          href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/report`}
          className={`mx-auto p-8px ${inReport ? 'stroke-primaryYellow text-primaryYellow' : 'stroke-secondaryBlue text-secondaryBlue'} hover:stroke-primaryYellow hover:text-primaryYellow`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_3554_65708)">
              <path
                d="M11.6668 1.8916V5.33372C11.6668 5.80043 11.6668 6.03378 11.7577 6.21204C11.8376 6.36885 11.965 6.49633 12.1218 6.57622C12.3001 6.66705 12.5335 6.66705 13.0002 6.66705H16.4423M6.66683 12.5003V15.0003M13.3335 10.8337V15.0003M10.0002 8.75033V15.0003M16.6668 8.32385V14.3337C16.6668 15.7338 16.6668 16.4339 16.3943 16.9686C16.1547 17.439 15.7722 17.8215 15.3018 18.0612C14.767 18.3337 14.067 18.3337 12.6668 18.3337H7.3335C5.93336 18.3337 5.2333 18.3337 4.69852 18.0612C4.22811 17.8215 3.84566 17.439 3.60598 16.9686C3.3335 16.4339 3.3335 15.7338 3.3335 14.3337V5.66699C3.3335 4.26686 3.3335 3.5668 3.60598 3.03202C3.84566 2.56161 4.22811 2.17916 4.69852 1.93948C5.2333 1.66699 5.93336 1.66699 7.3335 1.66699H10.01C10.6215 1.66699 10.9272 1.66699 11.2149 1.73607C11.47 1.79731 11.7139 1.89832 11.9375 2.03539C12.1898 2.19 12.406 2.40619 12.8384 2.83857L15.4953 5.49542C15.9276 5.9278 16.1438 6.14399 16.2984 6.39628C16.4355 6.61996 16.5365 6.86382 16.5978 7.11891C16.6668 7.40663 16.6668 7.71237 16.6668 8.32385Z"
                stroke="fill-current"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </Link>
        {/* Info: (20240611 - Julian) Project Setting */}
        <Link
          href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/setting`}
          className={`mx-auto p-8px ${inSetting ? 'text-primaryYellow' : 'text-secondaryBlue'} hover:text-primaryYellow`}
        >
          <FiSettings size={20} />
        </Link>
      </div>
    </>
  );
};

export default ProjectSidebar;
