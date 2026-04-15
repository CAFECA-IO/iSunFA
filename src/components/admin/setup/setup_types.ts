export enum StepStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export interface IStepProps {
  step?: number;
  isActive: boolean;
  isCompleted: boolean;
  onNext: () => void;
  onReset?: () => void;
  envData?: Record<string, string>;
}
