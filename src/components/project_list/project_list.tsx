import Image from 'next/image';
import { Dispatch, SetStateAction } from 'react';
import ProjectCard from '../project_card/project_card';
import { IProject } from '../../interfaces/project';
import Pagination from '../pagination/pagination';

interface IProjectListProps {
  projects: IProject[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}

const ProjectList = ({ projects, currentPage, setCurrentPage, totalPages }: IProjectListProps) => {
  const displayedProjectList =
    projects.length > 0 ? (
      <div className="my-40px flex w-full flex-col items-center gap-y-16px">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <div className="mt-80px">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    ) : (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>Empty</p>
      </div>
    );

  return displayedProjectList;
};

export default ProjectList;
