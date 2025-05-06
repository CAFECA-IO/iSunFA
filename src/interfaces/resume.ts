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
