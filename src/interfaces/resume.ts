import { IEducationExperience, IWorkExperience } from '@/interfaces/experience';
import { ILanguageSkill, ICertificateSkill } from '@/interfaces/skill';

export interface IPersonalInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address: string;
  isRelatedCompany: boolean;
  isWorkingISunCloud: boolean;
  hasCriminalRecord: boolean;
  whereLearnAboutJob: string;
}

export interface IPreference {
  employmentTypes: string[];
  shifts: string[];
  locationTypes: string[];
  startDate: string;
  salaryExpectation: string;
}

export interface IAttachment {
  attachments: FileList | null;
  personalWebsite: string;
}

export interface IResume {
  personalInfo: IPersonalInfo;
  educationList: IEducationExperience[];
  workList: IWorkExperience[];
  languageList: ILanguageSkill[];
  certificateList: ICertificateSkill[];
  preference: IPreference;
  attachment: IAttachment;
}
