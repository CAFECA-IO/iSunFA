export interface ISalary {
  department: string;
  names_ids: { name: string; id: number }[];
}

export interface ISalaryRequest {
  description: string;
  start_date: Date;
  end_date: Date;
}
