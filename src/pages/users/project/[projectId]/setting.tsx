import Head from 'next/head';
import Image from 'next/image';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React, { useState } from 'react';
import { FaArrowLeft, FaCheck, FaChevronDown } from 'react-icons/fa';
import { FiEdit, FiSearch } from 'react-icons/fi';
import { RxCrossCircled } from 'react-icons/rx';
import { LuChevronsUpDown } from 'react-icons/lu';
import { useGlobalCtx } from '@/contexts/global_context';
import NavBar from '@/components/nav_bar/nav_bar';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { Button } from '@/components/button/button';
import { stageList } from '@/constants/project';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IMember, dummyMemberList } from '@/interfaces/member';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_COMPANY_IMAGE_URL, DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { UploadType } from '@/constants/file';

// Info: (2024704 - Anna) For list
// Info: (2024704 - Anna) 定義階段名稱到翻譯鍵值的映射
interface StageNameMap {
  [key: string]: string;
}

const stageNameMap: StageNameMap = {
  Designing: 'project:STAGE_NAME_MAP.DESIGNING',
  Developing: 'project:STAGE_NAME_MAP.DEVELOPING',
  'Beta Testing': 'project:STAGE_NAME_MAP.BETA_TESTING',
  Selling: 'project:STAGE_NAME_MAP.SELLING',
  Sold: 'project:STAGE_NAME_MAP.SOLD',
  Archived: 'project:STAGE_NAME_MAP.ARCHIVED',
};
interface IProjectSettingPageProps {
  projectId: string;
}

const ProjectSettingPage = ({ projectId }: IProjectSettingPageProps) => {
  const { t } = useTranslation(['common', 'project']);
  const { isAuthLoading } = useUserCtx();

  // ToDo: (20240617 - Julian) [Beta] Replace with real data
  const projectName = 'BAIFA';
  const projectImageSrc = DEFAULT_COMPANY_IMAGE_URL;
  const projectStage = stageList[0];
  const projectMembers = dummyMemberList;

  const { profileUploadModalDataHandler, profileUploadModalVisibilityHandler } = useGlobalCtx();

  const [changedProjectName, setChangedProjectName] = useState(projectName);
  const [changedStage, setChangedStage] = useState(projectStage);
  const [selectedMembers, setSelectedMembers] = useState<IMember[]>(projectMembers);
  const [searchMemberValue, setSearchMemberValue] = useState('');

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: membersRef,
    componentVisible: isMembersVisible,
    setComponentVisible: setMembersVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20240617 - Julian) 停用 Save 按鈕的條件：
  const isSaveInvalid =
    // Info: (20240617 - Julian) 專案名稱 & 階段 & 成員皆未變更
    (changedProjectName === projectName &&
      changedStage === projectStage &&
      selectedMembers === projectMembers) ||
    // Info: (20240617 - Julian) 專案名稱/成員為空
    changedProjectName === '' ||
    selectedMembers.length === 0;

  const membersAmount = selectedMembers.length;

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChangedProjectName(event.target.value);
  };
  const searchMemberChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchMemberValue(event.target.value);
  };
  const backClickHandler = () => window.history.back();

  const stageMenuClickHandler = () => setStageOptionsVisible(!isStageOptionsVisible);
  const membersMenuClickHandler = () => setMembersVisible(!isMembersVisible);

  const saveClickHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const profileUploadClickHandler = () => {
    profileUploadModalDataHandler(UploadType.PROJECT);
    profileUploadModalVisibilityHandler();
  };

  // ToDo: (20240612 - Julian) [Beta] get member list from API
  const filteredMemberList = dummyMemberList.filter((member) => {
    return (
      // Info: (20240611 - Julian) 搜尋條件：名字或職稱
      member.name.toLowerCase().includes(searchMemberValue.toLowerCase()) ||
      member.role.toLowerCase().includes(searchMemberValue.toLowerCase())
    );
  });

  const displaySelectedMembers =
    selectedMembers.length > 0 ? (
      selectedMembers.map((member) => {
        const removeMemberHandler = () => {
          const newMembers = selectedMembers.filter((selectedMember) => selectedMember !== member);
          setSelectedMembers(newMembers);
        };
        return (
          <div className="flex flex-none items-center gap-8px rounded-full border border-badge-text-secondary p-6px text-sm text-dropdown-text-primary">
            <Image src="/elements/yellow_check.svg" alt="member_avatar" width={20} height={20} />
            <p className="whitespace-nowrap">{member.name}</p>
            <button type="button" onClick={removeMemberHandler}>
              <RxCrossCircled size={16} />
            </button>
          </div>
        );
      })
    ) : (
      <p className="text-left text-input-text-input-placeholder">
        {t('project:PROJECT.CHOOSE_TEAM_MEMBERS')}
      </p>
    );

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-sm border border-input-stroke-input ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {stageList.map((stage) => {
        const clickHandler = () => {
          setChangedStage(stage);
          setStageOptionsVisible(false);
        };
        return (
          <button
            key={stage}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={clickHandler}
          >
            {t(stageNameMap[stage])}
          </button>
        );
      })}
    </div>
  );

  const displayMemberList = filteredMemberList.map((member) => {
    const isSelected = selectedMembers.includes(member);
    const memberClickHandler = () => {
      if (isSelected) {
        // Info: (20240611 - Julian) 如果已經選取，則移除
        const newMembers = selectedMembers.filter(
          (selectedMember) => selectedMember.name !== member.name
        );
        setSelectedMembers(newMembers);
      } else {
        // Info: (20240611 - Julian) 如果沒有選取，則加入
        setSelectedMembers([...selectedMembers, member]);
      }
    };

    return (
      <button
        key={member.name}
        type="button"
        className="flex w-full items-center justify-between px-12px py-8px hover:bg-dropdown-surface-item-hover"
        onClick={memberClickHandler}
      >
        <div className="flex flex-1 items-end gap-12px">
          <Image src={member.imageId} alt="member_avatar" width={20} height={20} />
          <p className="text-sm text-dropdown-text-primary">{member.name}</p>
          <p className="text-xs text-dropdown-text-secondary">{member.role}</p>
        </div>

        <FaCheck size={16} className={`${isSelected ? 'block' : 'hidden'}`} />
      </button>
    );
  });

  const displayMembersMenu = (
    <div
      ref={membersRef}
      className={`absolute bottom-full left-0 mb-10px grid w-full grid-cols-1 overflow-hidden rounded-sm border bg-white px-12px py-10px md:bottom-auto md:top-50px md:mb-0 ${isMembersVisible ? 'grid-rows-1 opacity-100 shadow-dropmenu' : 'grid-rows-0 opacity-0'} transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col items-start">
        {/* Info: (20240611 - Julian) search bar */}
        <div className="my-8px flex w-full items-center justify-between rounded-sm border px-12px py-8px text-icon-surface-single-color-primary">
          <input
            id="companySearchBar"
            type="text"
            placeholder={t('common:COMMON.SEARCH')}
            value={searchMemberValue}
            onChange={searchMemberChangeHandler}
            className="w-full outline-none placeholder:text-input-text-input-placeholder"
          />
          <FiSearch size={16} />
        </div>
        <div className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
          {t('project:PROJECT.DEVELOPMENT_DEPARTMENT')}
        </div>
        {/* Info: (20240611 - Julian) member list */}
        <div className="flex max-h-50px w-full flex-col items-start overflow-y-auto overflow-x-hidden md:max-h-100px">
          {displayMemberList}
        </div>
      </div>
    </div>
  );

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      <ProjectSidebar projectId={projectId} />
      <div className="flex min-h-screen bg-gray-100">
        <div className="mb-60px mt-120px flex-1 md:ml-80px">
          <div className="flex flex-col px-16px md:px-60px">
            {/* Info: (20240611 - Julian) Title */}
            <div className="flex items-center gap-24px">
              <Button
                type="button"
                variant="tertiaryOutline"
                onClick={backClickHandler}
                className="h-40px w-40px p-0"
              >
                <FaArrowLeft />
              </Button>
              {/* Info: (20240611 - Julian) Project Name */}
              <h1 className="text-4xl font-semibold text-text-neutral-secondary">
                {projectName} - {t('common:NAV_BAR.SETTING')}
              </h1>
            </div>
            {/* Info: (20240617 - Julian) Divider */}
            <hr className="my-24px border border-divider-stroke-lv-4" />
            {/* Info: (20240617 - Julian) Project Setting Form */}
            <form
              onSubmit={saveClickHandler}
              className="flex flex-1 flex-col gap-y-36px py-40px text-input-text-primary"
            >
              <div className="flex flex-col items-center gap-40px md:flex-row">
                {/* Info: (20240617 - Julian) open profile update modal */}
                <button
                  type="button"
                  onClick={profileUploadClickHandler}
                  className="group relative flex h-150px w-150px items-center justify-center overflow-hidden rounded-full"
                >
                  <Image
                    src={projectImageSrc}
                    alt={`${projectName}_icon`}
                    width={150}
                    height={150}
                    className="group-hover:brightness-50"
                  />
                  <FiEdit
                    className="absolute hidden text-surface-neutral-solid-light group-hover:block"
                    size={40}
                  />
                </button>
                <div className="grid w-full flex-1 grid-cols-1 gap-x-40px gap-y-36px md:grid-cols-2">
                  {/* Info: (20240617 - Julian) Project Name */}
                  <div className="flex w-full flex-col items-start gap-y-8px">
                    <p className="font-semibold">{t('project:PROJECT.PROJECT_NAME')}</p>
                    <input
                      id="changedProjectName"
                      type="text"
                      className="h-44px w-full rounded-sm border border-input-stroke-input px-12px outline-none"
                      placeholder={t('project:PROJECT.ENTER_NEW_PROJECT_NAME')}
                      value={changedProjectName}
                      onChange={nameChangeHandler}
                      required
                    />
                  </div>
                  {/* Info: (20240617 - Julian) Stage */}
                  <div className="flex w-full flex-col items-start gap-y-8px">
                    <p className="font-semibold">{t('project:PROJECT.STAGE')}</p>
                    <div
                      onClick={stageMenuClickHandler}
                      className={`relative flex h-44px w-full items-center justify-between rounded-sm border bg-input-surface-input-background ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px hover:cursor-pointer`}
                    >
                      {changedStage}
                      <FaChevronDown />
                      {displayedStageOptions}
                    </div>
                  </div>
                  {/* Info: (20240617 - Julian) Team Members */}
                  <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
                    <div className="flex w-full flex-col items-start gap-y-8px">
                      <div className="flex w-full items-end justify-between">
                        <p className="font-semibold">{t('project:PROJECT.TEAM_MEMBERS')}</p>
                        {/* Info: (20240611 - Julian) amount of selected members */}
                        <p className="text-sm text-input-text-secondary">{membersAmount}</p>
                      </div>
                      <div className="relative flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-6px md:h-46px">
                        <div className="flex w-full flex-1 flex-wrap gap-4px md:flex-nowrap md:overflow-x-auto">
                          {displaySelectedMembers}
                        </div>
                        <button
                          id="membersMenuButton"
                          type="button"
                          onClick={membersMenuClickHandler}
                        >
                          <LuChevronsUpDown size={20} />
                        </button>

                        {displayMembersMenu}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Info: (20240617 - Julian) submit button */}
              <div className="w-full md:ml-auto md:w-fit">
                <Button type="submit" className="w-full" variant="default" disabled={isSaveInvalid}>
                  <p>Save</p>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="fill-current"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12.8594 3.27637C12.774 3.25586 12.6746 3.25104 12.2312 3.25104H6.58577V5.33438C6.58577 5.58011 6.58636 5.7193 6.59464 5.82064C6.59725 5.85262 6.60017 5.87275 6.60214 5.88398C6.60704 5.89059 6.61289 5.89644 6.61951 5.90134C6.63074 5.90332 6.65086 5.90624 6.68285 5.90885C6.78419 5.91713 6.92338 5.91771 7.16911 5.91771H12.8358C13.0815 5.91771 13.2207 5.91713 13.322 5.90885C13.354 5.90623 13.3741 5.90332 13.3854 5.90134C13.392 5.89644 13.3978 5.89059 13.4027 5.88398C13.4047 5.87275 13.4076 5.85262 13.4102 5.82064C13.4185 5.7193 13.4191 5.58011 13.4191 5.33438V3.64607C13.2421 3.47187 13.1836 3.42243 13.1244 3.38612C13.0424 3.33586 12.9529 3.29883 12.8594 3.27637ZM14.9191 5.14504V5.33438L14.9191 5.35919C14.9191 5.57112 14.9192 5.77282 14.9053 5.94278C14.8901 6.12812 14.8548 6.34072 14.7465 6.5532C14.5947 6.85112 14.3525 7.09334 14.0546 7.24514C13.8421 7.3534 13.6295 7.38872 13.4442 7.40387C13.2742 7.41775 13.0725 7.41773 12.8606 7.41771L12.8358 7.41771H7.16911C7.16083 7.41771 7.15256 7.41771 7.14431 7.41771C6.93238 7.41773 6.73067 7.41775 6.5607 7.40387C6.37536 7.38872 6.16277 7.3534 5.95029 7.24514C5.65237 7.09334 5.41015 6.85112 5.25835 6.5532C5.15008 6.34072 5.11476 6.12812 5.09962 5.94278C5.08573 5.77281 5.08575 5.57111 5.08577 5.35917C5.08577 5.35092 5.08578 5.34266 5.08578 5.33438V3.27141C5.02871 3.27461 4.97406 3.27832 4.92152 3.28261C4.55102 3.31289 4.352 3.36839 4.20796 3.44178C3.87867 3.60956 3.61096 3.87728 3.44318 4.20656C3.36979 4.3506 3.31428 4.54962 3.28401 4.92012C3.25303 5.29938 3.25244 5.7886 3.25244 6.50104V13.501C3.25244 14.2135 3.25303 14.7027 3.28401 15.082C3.31428 15.4525 3.36979 15.6515 3.44318 15.7955C3.61096 16.1248 3.87868 16.3925 4.20796 16.5603C4.352 16.6337 4.55102 16.6892 4.92152 16.7195C4.97406 16.7238 5.02871 16.7275 5.08578 16.7307V12.1677L5.08577 12.1429C5.08575 11.931 5.08573 11.7293 5.09962 11.5593C5.11476 11.374 5.15008 11.1614 5.25835 10.9489C5.41015 10.651 5.65237 10.4087 5.95029 10.257C6.16277 10.1487 6.37536 10.1134 6.5607 10.0982C6.73067 10.0843 6.93238 10.0844 7.14431 10.0844L7.16911 10.0844H12.8358L12.8606 10.0844C13.0725 10.0844 13.2742 10.0843 13.4442 10.0982C13.6295 10.1134 13.8421 10.1487 14.0546 10.257C14.3525 10.4087 14.5947 10.651 14.7465 10.9489C14.8548 11.1614 14.8901 11.374 14.9053 11.5593C14.9192 11.7293 14.9191 11.931 14.9191 12.1429L14.9191 12.1677V16.7307C14.9762 16.7275 15.0308 16.7238 15.0834 16.7195C15.4539 16.6892 15.6529 16.6337 15.7969 16.5603C16.1262 16.3925 16.3939 16.1248 16.5617 15.7955C16.6351 15.6515 16.6906 15.4525 16.7209 15.082C16.7519 14.7027 16.7524 14.2135 16.7524 13.501V7.77228C16.7524 7.32893 16.7476 7.2295 16.7271 7.14408C16.7047 7.05054 16.6676 6.96113 16.6174 6.87911C16.5715 6.80421 16.5046 6.73049 16.1911 6.41699L14.9191 5.14504ZM14.2207 18.2493C14.5941 18.2462 14.9207 18.2378 15.2055 18.2145C15.6688 18.1766 16.0872 18.0959 16.4779 17.8968C17.0894 17.5852 17.5866 17.088 17.8982 16.4765C18.0973 16.0858 18.178 15.6674 18.2159 15.2041C18.2525 14.7565 18.2525 14.2058 18.2524 13.5324V13.501V7.77228C18.2524 7.74999 18.2525 7.72794 18.2525 7.70609C18.2527 7.36343 18.253 7.07424 18.1857 6.79391C18.1265 6.54732 18.0288 6.31159 17.8963 6.09536C17.7457 5.84954 17.541 5.64522 17.2985 5.40311C17.2831 5.38768 17.2675 5.37209 17.2517 5.35633L14.6472 2.75176C14.6314 2.736 14.6158 2.72039 14.6004 2.70494C14.3583 2.46245 14.1539 2.2578 13.9081 2.10716C13.6919 1.97466 13.4562 1.87702 13.2096 1.81782C12.9292 1.75051 12.6401 1.75074 12.2974 1.75101C12.2756 1.75103 12.2535 1.75104 12.2312 1.75104H6.50244L6.47102 1.75104C6.26121 1.75104 6.0633 1.75104 5.87672 1.75214C5.86316 1.75141 5.84951 1.75104 5.83578 1.75104C5.81842 1.75104 5.8012 1.75163 5.78414 1.75279C5.41076 1.75587 5.08418 1.76433 4.79937 1.7876C4.33611 1.82545 3.91771 1.90618 3.52697 2.10527C2.91545 2.41686 2.41826 2.91405 2.10667 3.52558C1.90758 3.91632 1.82684 4.33471 1.78899 4.79798C1.75243 5.24554 1.75243 5.79625 1.75244 6.46963L1.75244 6.50104V13.501L1.75244 13.5325C1.75243 14.2058 1.75243 14.7565 1.78899 15.2041C1.82684 15.6674 1.90758 16.0858 2.10667 16.4765C2.41826 17.088 2.91545 17.5852 3.52697 17.8968C3.91771 18.0959 4.33611 18.1766 4.79937 18.2145C5.08418 18.2378 5.41076 18.2462 5.78414 18.2493C5.8012 18.2505 5.81842 18.251 5.83578 18.251C5.84951 18.251 5.86317 18.2507 5.87672 18.2499C6.06332 18.2511 6.26123 18.251 6.47105 18.251H6.50244H13.5024H13.5338C13.7437 18.251 13.9416 18.2511 14.1282 18.2499C14.1417 18.2507 14.1554 18.251 14.1691 18.251C14.1865 18.251 14.2037 18.2505 14.2207 18.2493ZM13.4191 16.751V12.1677C13.4191 11.922 13.4185 11.7828 13.4102 11.6815C13.4076 11.6495 13.4047 11.6293 13.4027 11.6181C13.3978 11.6115 13.392 11.6056 13.3854 11.6007C13.3741 11.5988 13.354 11.5959 13.322 11.5932C13.2207 11.585 13.0815 11.5844 12.8358 11.5844H7.16911C6.92338 11.5844 6.78419 11.585 6.68285 11.5932C6.65086 11.5959 6.63074 11.5988 6.61951 11.6007C6.61289 11.6056 6.60704 11.6115 6.60214 11.6181C6.60017 11.6293 6.59725 11.6495 6.59464 11.6815C6.58636 11.7828 6.58577 11.922 6.58577 12.1677V16.751H13.4191Z"
                      fill="#996301"
                    />
                  </svg>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('project:PROJECT.PROJECT_SETTING')} - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        {displayedBody}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.projectId || typeof params.projectId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      projectId: params.projectId,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};

export default ProjectSettingPage;
