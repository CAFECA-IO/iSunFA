import { IAdmin } from './admin';
import { IAuditReports } from './audit_reports';
import { IClient } from './client';
import { ICompanyKYC } from './company_kyc';
import { IDepartment } from './department';
import { IEmployee } from './employees';
import { ISubscription } from './subscription';
import { IUser } from './user';

export interface ICompany {
  id: number;
  code: string;
  regional: string;
  company: string;
  admins: IAdmin[];
  auditReports: IAuditReports[];
  clients: IClient[];
  departments: IDepartment[];
  employees: IEmployee[];
  companyKYCs: ICompanyKYC[];
  subscriptions: ISubscription[];
  users: IUser[];
}

export interface ICompanyItem {
  name: string;
  role: string;
  brn: string;
  icon: string;
  isPassedKyc: boolean;
}
