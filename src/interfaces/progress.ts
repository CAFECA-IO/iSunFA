export interface IProjectProgress {
  date: Date;
  progress: IProgress[];
}

interface IProgress {
  progress: string;
  projectNum: number;
}
