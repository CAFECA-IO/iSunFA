import React, { useState } from 'react';
import { FiPlusCircle, FiPlus } from 'react-icons/fi';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { FaChevronDown, FaListUl } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IProject } from '@/interfaces/project';
import { ProjectStage } from '@/constants/project';
import { Button } from '@/components/button/button';
import ProjectList from '@/components/project_list/project_list';
import ProjectStageBlock from '../project_stage_block/project_stage_block';

enum Layout {
  LIST = 'list',
  GRID = 'grid',
}

const dummyProjects: IProject[] = [
  {
    id: 1,
    companyId: 1,
    imageId: null,
    name: 'Project 1',
    stage: ProjectStage.ARCHIVED,
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 3,
    members: [
      {
        name: 'Sunny',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'David',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Wendy',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 2,
    companyId: 2,
    name: 'Project 2',
    imageId: null,
    stage: 'ProjectStage.SELLING',
    income: 4200,
    expense: 4700,
    profit: -500,
    contractAmount: 5,
    members: [
      {
        name: 'Alice',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Bob',
        imageId: '/entities/isuncloud.png',
      },
      {
        name: 'Cathy',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Eva',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Xavier',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'Hillary',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Colin',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Hank',
        imageId: '/entities/isuncloud.png',
      },
      {
        name: 'Simon',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Elaine',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Austin',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 3,
    companyId: 3,
    name: 'Project 3',
    imageId: null,
    stage: ProjectStage.ARCHIVED,
    income: 2310,
    expense: 2354,
    profit: -44,
    contractAmount: 26,
    members: [
      {
        name: 'Zack',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 4,
    companyId: 4,
    imageId: null,
    name: 'StellarScape',
    stage: ProjectStage.ARCHIVED,
    income: 13940,
    expense: 12480,
    profit: 1460,
    contractAmount: 8,
    members: [
      {
        name: 'Fiona',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'George',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 5,
    companyId: 5,
    imageId: null,
    name: 'Project 5',
    stage: ProjectStage.ARCHIVED,
    income: 23425,
    expense: 12412,
    profit: 11013,
    contractAmount: 20,
    members: [
      {
        name: 'Olivia',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Daisy',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'Rita',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Silvia',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
];

const ProjectPageBody = () => {
  const [search, setSearch] = useState<string>('');
  const [filteredStage, setFilteredStage] = useState<string>('ALL'); // Info: (2024607 - Julian) For list
  const [currentStage, setCurrentStage] = useState<string>('ALL'); // Info: (2024607 - Julian) For grid
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 10; // ToDo: (2024606 - Julian) Get total page from API

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setIsStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);

  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  const stageMenuClickHandler = () => setIsStageOptionsVisible(!isStageOptionsVisible);
  const allClickHandler = () => {
    setFilteredStage('ALL');
    setIsStageOptionsVisible(false);
  };
  const designClickHandler = () => {
    setFilteredStage(ProjectStage.DESIGNING);
    setIsStageOptionsVisible(false);
  };
  const developClickHandler = () => {
    setFilteredStage(ProjectStage.DEVELOPING);
    setIsStageOptionsVisible(false);
  };
  const betaTestingClickHandler = () => {
    setFilteredStage(ProjectStage.BETA_TESTING);
    setIsStageOptionsVisible(false);
  };
  const sellingClickHandler = () => {
    setFilteredStage(ProjectStage.SELLING);
    setIsStageOptionsVisible(false);
  };
  const soldClickHandler = () => {
    setFilteredStage(ProjectStage.SOLD);
    setIsStageOptionsVisible(false);
  };
  const archivedClickHandler = () => {
    setFilteredStage(ProjectStage.ARCHIVED);
    setIsStageOptionsVisible(false);
  };

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-xs border border-input-stroke-input
        ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'}
        bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={allClickHandler}
      >
        All
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={designClickHandler}
      >
        Designing
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={developClickHandler}
      >
        Developing
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={betaTestingClickHandler}
      >
        Beta Testing
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={sellingClickHandler}
      >
        Selling
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={soldClickHandler}
      >
        Sold
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={archivedClickHandler}
      >
        Archived
      </button>
    </div>
  );

  const filteredProjects = dummyProjects
    .filter((project) => {
      if (filteredStage === 'ALL') return true;
      return project.stage === filteredStage;
    })
    .filter((project) => {
      return project.name.toLowerCase().includes(search.toLowerCase());
    });

  const stageList = [
    ProjectStage.SELLING,
    ProjectStage.DESIGNING,
    ProjectStage.DEVELOPING,
    ProjectStage.BETA_TESTING,
    ProjectStage.SOLD,
    ProjectStage.ARCHIVED,
  ];

  const projectStageGrid = (
    <div className="flex items-start gap-12px overflow-x-auto">
      {stageList.map((stage) => (
        <ProjectStageBlock
          key={stage}
          stage={stage}
          projects={dummyProjects.filter((project) => project.stage === stage)}
        />
      ))}
    </div>
  );

  // ToDo: (2024606 - Julian) Grid Layout
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
    return (
      <button
        key={stage}
        type="button"
        onClick={() => setCurrentStage(stage)}
        className={`border-b-2 ${activeStageStyle} px-12px py-8px hover:border-tabs-text-hover hover:text-tabs-text-hover`}
      >
        {stage}
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
            Project
          </h1>
          <Button
            type="button"
            variant="tertiary"
            className="hidden items-center gap-4px px-4 py-8px md:flex"
            // ToDo: (2024606 - Julian) Add Project Function
          >
            <FiPlusCircle size={24} />
            Add Project
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className="flex h-46px w-46px items-center justify-center p-0 md:hidden"
            // ToDo: (2024606 - Julian) Add Project Function
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
              <p className="font-semibold">Stage</p>
              <div
                onClick={stageMenuClickHandler}
                className={`relative flex h-44px w-full items-center justify-between rounded-xs border bg-input-surface-input-background 
            ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px hover:cursor-pointer md:w-200px`}
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
                placeholder="Search Project"
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
