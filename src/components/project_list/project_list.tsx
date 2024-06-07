import React, { useState } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { FaChevronDown, FaListUl } from 'react-icons/fa6';
import { Button } from '../button/button';
import { IProject } from '@/interfaces/project';
import { ProjectStage } from '@/constants/project';
import ProjectCard from '../project_card/project_card';

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
    stage: ProjectStage.SELLING,
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
    stage: ProjectStage.DEVELOPING,
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
    stage: ProjectStage.DESIGNING,
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
];

const ProjectList = () => {
  const [search, setSearch] = useState<string>('');
  const [filteredStage, setFilteredStage] = useState<string>('ALL');
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);

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

  const filteredProjects = dummyProjects
    .filter((project) => {
      return (
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.stage.toLowerCase().includes(search.toLowerCase())
      );
    })
    .filter((project) => {
      if (filteredStage === 'ALL') {
        return true; // Info: (2024606 - Julian) 選擇全部
      }
      return project.stage === filteredStage;
    });

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

  const displayedProjectList =
    filteredProjects.length > 0 ? (
      <div className="my-40px flex w-full flex-col gap-y-16px">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    ) : (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>Empty</p>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Info: (2024606 - Julian) Filter */}
      <div className="flex w-full flex-col items-end gap-x-24px gap-y-40px md:flex-row">
        {/* Info: (2024606 - Julian) Select Stage */}
        <div className="flex w-full flex-col items-start gap-8px text-input-text-primary md:w-auto">
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
        <div className="flex gap-x-8px">
          {/* Info: (2024606 - Julian) List button */}
          <Button type="button" variant={listBtnStyle} className="p-3" onClick={listLayoutHandler}>
            <FaListUl size={20} />
          </Button>
          {/* Info: (2024606 - Julian) Grid button */}
          <Button type="button" variant={gridBtnStyle} className="p-3" onClick={gridLayoutHandler}>
            <FiGrid size={20} />
          </Button>
        </div>
      </div>

      {/* Info: (2024606 - Julian) List */}
      {displayedProjectList}
    </div>
  );
};

export default ProjectList;
