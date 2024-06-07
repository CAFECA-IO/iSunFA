export interface EmployeeProject {
  id: number;
  employeeId: number;
  projectId: number;
  startDate: number;
  endDate: number | null;
  createdAt: number;
  updatedAt: number;
}
