import { FiPlus } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';
import { ProjectStage } from '@/constants/project';
import ProjectCard from '../project_card/project_card';
import { IProject } from '../../interfaces/project';

interface IProjectStageBlockProps {
  stage: ProjectStage;
  projects: IProject[];
}

const ProjectStageBlock = ({ stage, projects }: IProjectStageBlockProps) => {
  const { addProjectModalVisibilityHandler, addProjectModalDataHandler } = useGlobalCtx();

  const addClickHandler = () => {
    addProjectModalDataHandler(stage);
    addProjectModalVisibilityHandler();
  };

  const displayedProjects = projects
    .filter((project) => project.stage === stage)
    .map((project) => <ProjectCard key={project.id} project={project} />);

  return (
    <div className="flex w-full flex-none flex-col items-center gap-y-16px rounded-xs border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 px-20px py-16px md:w-380px">
      <h2 className="text-2xl font-semibold text-text-neutral-primary">{stage}</h2>
      <div className="flex h-330px w-full flex-col gap-y-8px overflow-y-auto border-t border-stroke-neutral-quaternary py-14px md:h-500px">
        {displayedProjects}
      </div>
      <div>
        <button
          type="button"
          className="mx-auto mt-24px rounded-xs border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
          onClick={addClickHandler}
        >
          <FiPlus size={20} />
        </button>
      </div>
    </div>
  );
};

export default ProjectStageBlock;
