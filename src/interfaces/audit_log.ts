import { AuditLogAction } from "@/constants/audit_log";

export interface IAuditLog {
  id: string;
  createdAt: number;
  action: AuditLogAction;
  dataType: string;
  dataId: string;
  user: {
    id: string;
    name: string | null;
    address: string;
  };
}