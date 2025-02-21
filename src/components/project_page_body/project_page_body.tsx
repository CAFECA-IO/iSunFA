import React, { useState, useEffect } from 'react';
import { FiGrid, FiSearch, FiPlusCircle, FiPlus } from 'react-icons/fi';
import { FaChevronDown, FaChevronLeft, FaChevronRight, FaListUl } from 'react-icons/fa6';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IProject } from '@/interfaces/project';
import { ProjectStage, stageList } from '@/constants/project';
import { Button } from '@/components/button/button';
import ProjectList from '@/components/project_list/project_list';
import { Layout } from '@/constants/layout';
import ProjectStageBlock from '@/components/project_stage_block/project_stage_block';
import { useTranslation } from 'next-i18next';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

// Info: (2024704 - Anna) For list
interface StageNameMap {
  [key: string]: string;
}

const stageNameMap: StageNameMap = {
  All: 'project:STAGE_NAME_MAP.ALL',
  Designing: 'project:STAGE_NAME_MAP.DESIGNING',
  Developing: 'project:STAGE_NAME_MAP.DEVELOPING',
  'Beta Testing': 'project:STAGE_NAME_MAP.BETA_TESTING',
  Selling: 'project:STAGE_NAME_MAP.SELLING',
  Sold: 'project:STAGE_NAME_MAP.SOLD',
  Archived: 'project:STAGE_NAME_MAP.ARCHIVED',
};

const ProjectPageBody = () => {
  const { t } = useTranslation(['common', 'project']);

  const { addProjectModalVisibilityHandler } = useGlobalCtx();
  const { selectedAccountBook } = useUserCtx();

  const [search, setSearch] = useState<string>('');
  const [filteredStage, setFilteredStage] = useState<string>(t('project:STAGE_NAME_MAP.ALL')); // Info: (2024704 - Anna) For list
  const [currentStage, setCurrentStage] = useState<ProjectStage>(ProjectStage.SELLING); // Info: (2024607 - Julian) For grid
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 10;
  // ToDo: (20240606 - Julian) [Beta] Get total page from API

  const { trigger: getProjectList, data: projectList } = APIHandler<IProject[]>(
    APIName.PROJECT_LIST
  );

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setIsStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  // Info: (2024607 - Julian) 找到指定 Stage 的 index
  const currentStageIndex = stageList.findIndex((stage) => stage === currentStage);

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);

  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  // Info: (2024607 - Julian) 移動到上一個 Stage
  const leftClickHandler = () => {
    if (currentStageIndex > 0) {
      setCurrentStage(stageList[currentStageIndex - 1]);
    } else {
      // Info: (2024607 - Julian) 如果是第一個 Stage，則跳到最後一個 Stage
      setCurrentStage(stageList[stageList.length - 1]);
    }
  };
  // Info: (2024607 - Julian) 移動到下一個 Stage
  const rightClickHandler = () => {
    if (currentStageIndex < stageList.length - 1) {
      setCurrentStage(stageList[currentStageIndex + 1]);
    } else {
      // Info: (20240607 - Julian) 如果是最後一個 Stage，則跳到第一個 Stage
      setCurrentStage(stageList[0]);
    }
  };

  const stageMenuClickHandler = () => setIsStageOptionsVisible(!isStageOptionsVisible);

  useEffect(() => {
    if (currentLayout === Layout.GRID) {
      setCurrentStage(ProjectStage.SELLING);
    }

    if (currentLayout === Layout.LIST) {
      setFilteredStage(t('project:STAGE_NAME_MAP.ALL'));
    }
  }, [currentLayout]);

  useEffect(() => {
    getProjectList({
      params: { companyId: selectedAccountBook?.id },
    });
  }, []);

  const stageOptions = ['All', ...stageList]; // Info: (2024611 - Julian) Add All option

  // Info: (2024704 - Anna) 反向映射，用於從翻譯值回到原始名稱，以比對專案目前進行階段
  const stageNameMapReverse: { [key: string]: string } = {
    [t('project:STAGE_NAME_MAP.ALL')]: 'All',
    [t('project:STAGE_NAME_MAP.DESIGNING')]: 'Designing',
    [t('project:STAGE_NAME_MAP.DEVELOPING')]: 'Developing',
    [t('project:STAGE_NAME_MAP.BETA_TESTING')]: 'Beta Testing',
    [t('project:STAGE_NAME_MAP.SELLING')]: 'Selling',
    [t('project:STAGE_NAME_MAP.SOLD')]: 'Sold',
    [t('project:STAGE_NAME_MAP.ARCHIVED')]: 'Archived',
  };

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-xs border border-input-stroke-input ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {stageOptions.map((stage) => (
        <button
          key={stage}
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setFilteredStage(t(stageNameMap[stage]))}
        >
          {t(stageNameMap[stage])}
        </button>
      ))}
    </div>
  );

  const filteredProjects = projectList
    ? projectList
        .filter((project) => {
          // Info: (2024607 - Julian) 如果選擇 All，則顯示所有 Project
          if (filteredStage === t('project:STAGE_NAME_MAP.ALL')) return true;
          return project.stage === stageNameMapReverse[filteredStage]; // Info: (2024704 - Anna) 使用反向映射來比較階段名稱
        })
        .filter((project) => {
          return project.name.toLowerCase().includes(search.toLowerCase());
        })
    : [];

  const projectStageBlocksDesktop = (
    <div className="hidden items-start gap-12px overflow-x-auto scroll-smooth md:flex">
      {stageList.map((stage) => (
        <ProjectStageBlock key={stage} stage={stage} projects={filteredProjects} />
      ))}
    </div>
  );

  const projectStageBlocksMobile = (
    <div className="relative flex items-center">
      {/* Info: (2024607 - Julian) 為了避免切到 arrow button，所以多加一層 div */}
      <div className="overflow-hidden">
        <div
          className="flex w-full items-start transition-all duration-300 ease-in-out md:hidden"
          style={{ transform: `translateX(-${currentStageIndex * 100}%)` }} // Info: (2024607 - Julian) 移動到指定 Stage
        >
          {stageList.map((stage) => (
            <ProjectStageBlock key={stage} stage={stage} projects={filteredProjects} />
          ))}
        </div>
      </div>
      {/* Info: (2024606 - Julian) Arrow Buttons */}
      <button
        type="button"
        className="absolute -left-16px block p-10px md:hidden"
        onClick={leftClickHandler}
      >
        <FaChevronLeft size={16} />
      </button>
      <button
        type="button"
        className="absolute -right-16px block p-10px md:hidden"
        onClick={rightClickHandler}
      >
        <FaChevronRight size={16} />
      </button>
    </div>
  );

  const projectStageGrid = (
    <>
      {/* Info: (2024606 - Julian) Desktop Stage Blocks */}
      {projectStageBlocksDesktop}
      {/* Info: (2024606 - Julian) Mobile Stage Blocks */}
      {projectStageBlocksMobile}
    </>
  );

  // Info: (20240606 - Julian) Grid Layout
  const displayedProjects =
    currentLayout === Layout.LIST ? (
      <ProjectList
        projects={filteredProjects}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />
    ) : (
      projectStageGrid
    );

  const displayedStageTabs = stageList.map((stage) => {
    const activeStageStyle =
      stage === currentStage
        ? 'border-tabs-text-hover text-tabs-text-hover'
        : 'border-tabs-stroke-default text-tabs-text-default';
    const stageClickHandler = () => setCurrentStage(stage);

    return (
      <button
        key={stage}
        type="button"
        onClick={stageClickHandler}
        className={`border-b-2 ${activeStageStyle} px-12px py-8px hover:border-tabs-text-hover hover:text-tabs-text-hover`}
      >
        {/* Info: (2024704 - Anna) 翻譯Stage */}
        {t(stageNameMap[stage])}
      </button>
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div
        className="mx-16px mb-80px mt-160px flex w-full flex-1 flex-col gap-y-24px md:mx-120px md:mt-120px"
        style={{ width: '-webkit-fill-available' }}
      >
        {/* Info: (2024606 - Julian) Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
            {t('common:COMMON.PROJECT')}
          </h1>
          <Button
            type="button"
            variant="tertiary"
            className="hidden items-center gap-4px px-4 py-8px md:flex"
            onClick={addProjectModalVisibilityHandler}
          >
            <FiPlusCircle size={24} />
            {t('project:PROJECT.ADD_PROJECT')}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className="flex h-46px w-46px items-center justify-center p-0 md:hidden"
            onClick={addProjectModalVisibilityHandler}
          >
            <FiPlus size={24} />
          </Button>
        </div>
        {/* Info: (2024606 - Julian) Divider */}
        <hr className="border-divider-stroke-lv-4" />
        {/* Info: (2024606 - Julian) Project List */}
        <div className="flex flex-col items-center">
          {/* Info: (2024606 - Julian) Filter */}
          <div className="flex w-full flex-col items-center gap-x-24px gap-y-40px md:h-80px md:flex-row md:items-end">
            {/* Info: (2024606 - Julian) Select Stage */}
            <div
              className={`w-full flex-col items-start gap-8px ${currentLayout === Layout.LIST ? 'flex' : 'hidden'} text-input-text-primary md:w-auto`}
            >
              <p className="font-semibold">{t('project:PROJECT.STAGE')}</p>
              <div
                onClick={stageMenuClickHandler}
                className={`relative flex h-44px w-full items-center justify-between rounded-xs border bg-input-surface-input-background ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px hover:cursor-pointer md:w-200px`}
              >
                {filteredStage}
                <FaChevronDown />
                {displayedStageOptions}
              </div>
            </div>
            {/* Info: (2024606 - Julian) Search bar */}
            <div className="flex w-full flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
              <input
                id="project-search-bar"
                type="text"
                onChange={searchHandler}
                className="h-44px flex-1 outline-none placeholder:text-input-text-input-placeholder"
                placeholder={t('project:PROJECT.SEARCH_PROJECT')}
              />
              <FiSearch size={20} />
            </div>
            {/* Info: (2024606 - Julian) Layout Toggle */}
            <div className="ml-auto flex gap-x-8px">
              {/* Info: (2024606 - Julian) List button */}
              <Button
                type="button"
                variant={listBtnStyle}
                className="p-3"
                onClick={listLayoutHandler}
              >
                <FaListUl size={20} />
              </Button>
              {/* Info: (2024606 - Julian) Grid button */}
              <Button
                type="button"
                variant={gridBtnStyle}
                className="p-3"
                onClick={gridLayoutHandler}
              >
                <FiGrid size={20} />
              </Button>
            </div>
            {/* Info: (2024606 - Julian) Stage tabs (for mobile grid) */}
            <div
              className={`${currentLayout === Layout.GRID ? 'flex' : 'hidden'} flex-wrap gap-8px text-sm text-tabs-text-default md:hidden`}
            >
              {displayedStageTabs}
            </div>
          </div>
        </div>
        {/* Info: (2024606 - Julian) Projects */}
        {displayedProjects}
      </div>
    </div>
  );
};

export default ProjectPageBody;
