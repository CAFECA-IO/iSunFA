import { solutionRepo } from "@/repositories/solution.repo";

/**
 * Info: (20260706 - Luphia) 方案申請 Service
 */
export const applySolution = async (
  solutionId: string,
  data: {
    taxId: string;
    companyName: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
    message?: string;
  },
) => {
  return solutionRepo.createApplication({
    solutionId,
    ...data,
  });
};

/**
 * Info: (20260706 - Luphia) 管理後台：分頁取得申請紀錄
 */
export const getAdminApplicationsPaginated = async (params: {
  page: number;
  limit: number;
  search?: string;
  solutionId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  // Info: (20260706 - Luphia) 僅透過 Repo 操作 DB，query 邏輯封裝在 Repo 中
  return solutionRepo.listApplicationsPaginated(params);
};

/**
 * Info: (20260706 - Luphia) 管理後台：更新申請狀態
 */
export const updateApplicationStatus = async (id: string, status: string) => {
  return solutionRepo.updateApplicationStatus(id, status);
};
