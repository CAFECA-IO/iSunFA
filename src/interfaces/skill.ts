import { IExperienceDate } from '@/interfaces/experience';

// Info: (20250428 - Julian) --------------- common ---------------
export enum SkillType {
  LANGUAGE = 'Language',
  CERTIFICATE = 'Certificate',
}

export enum ModalType {
  CREATE = 'create',
  EDIT = 'edit',
}

// Info: (20250428 - Julian) --------------- Language ---------------
export enum Proficiency {
  ELEMENTARY = 'Elementary',
  LIMITED = 'Limited working',
  PROFESSIONAL = 'Professional working',
  NATIVE = 'Native or bilingual',
}

export interface ILanguageSkill {
  id: number;
  language: string;
  proficiency: keyof typeof Proficiency;
}

// Info: (20250429 - Julian) --------------- Certificate ---------------
export enum MimeType {
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export interface ICertificateSkill {
  id: number;
  name: string;
  issuingOrganization: string;
  issueDate: IExperienceDate;
  expirationDate: IExperienceDate;
  certificate: File;
}
