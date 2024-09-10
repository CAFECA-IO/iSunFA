import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa';
import { useGlobalCtx } from '@/contexts/global_context';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/button/button';
import NumericInput from '@/components/numeric_input/numeric_input';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';

enum Department {
  UI_UX = 'UI/UX',
  FRONTEND = 'Frontend',
  BACKEND = 'Backend',
}

const SalaryRecordForm = () => {
  const { t } = useTranslation(['common', 'salary']);
  const { salaryBookConfirmModalVisibilityHandler } = useGlobalCtx();

  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(Department.UI_UX);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [salaryAmount, setSalaryAmount] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [insurancePayments, setInsurancePayments] = useState<number>(0);
  const [description, setDescription] = useState<string>('');

  const [isRecordWorkingHours, setIsRecordWorkingHours] = useState<boolean>(false);
  const [workingHours, setWorkingHours] = useState<number>(0);
  const [participatingProjects, setParticipatingProjects] = useState<number>(0);
  const [isunfaHours, setIsunfaHours] = useState<number>(0);
  const [routineWorkHours, setRoutineWorkHours] = useState<number>(0);

  const {
    targetRef: departmentRef,
    componentVisible: isDepartmentVisible,
    setComponentVisible: setIsDepartmentVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const nameChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeName(e.target.value);
  };
  const descriptionChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  const recordWorkingHoursHandler = () => setIsRecordWorkingHours(!isRecordWorkingHours);
  const departmentToggleHandler = () => setIsDepartmentVisible(!isDepartmentVisible);

  const disableSubmit =
    datePeriod.startTimeStamp === 0 ||
    datePeriod.endTimeStamp === 0 ||
    employeeName === '' ||
    salaryAmount === 0 ||
    insurancePayments === 0 ||
    // Info: (20240716 - Julian) If record working hours is enabled, check if all fields are filled
    isRecordWorkingHours
      ? workingHours === 0 ||
        participatingProjects === 0 ||
        isunfaHours === 0 ||
        routineWorkHours === 0
      : false;

  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ToDo: (20240716 - Julian) [Beta] Submit

    salaryBookConfirmModalVisibilityHandler();
  };

  const cancelHandler = () => {
    window.history.back();
  };

  const departmentMenu = (
    <div
      ref={departmentRef}
      className={`absolute left-0 top-20 grid w-full grid-cols-1 overflow-hidden ${
        isDepartmentVisible ? 'visible grid-rows-1 opacity-100' : 'invisible grid-rows-0 opacity-0'
      } transition-all duration-300 ease-in-out`}
    >
      <div className="flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary px-12px py-10px text-dropdown-text-primary">
        {Object.values(Department).map((department) => (
          <button
            key={department}
            type="button"
            className="flex p-4px hover:bg-dropdown-surface-item-hover"
            onClick={() => {
              setSelectedDepartment(department);
              setIsDepartmentVisible(false);
            }}
          >
            {department}
          </button>
        ))}
      </div>
    </div>
  );
  const workingHoursPart = isRecordWorkingHours ? (
    <div className="grid grid-flow-row grid-cols-1 gap-x-60px gap-y-40px md:grid-cols-2">
      {/* Info: (20240715 - Julian) Working hours for the period */}
      <div className="flex w-full flex-1 flex-col items-start gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('salary:SALARY.WORKING_HOURS')}
        </p>
        <NumericInput
          id="input-working-hours"
          value={workingHours}
          setValue={setWorkingHours}
          className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
          isDecimal
        />
      </div>
      {/* Info: (20240715 - Julian) Number of Participating Projects */}
      <div className="flex w-full flex-1 flex-col items-start gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('salary:SALARY.NUMBER_OF_PARTICIPATING_PROJECTS')}
        </p>
        <NumericInput
          id="input-participating-projects"
          value={participatingProjects}
          setValue={setParticipatingProjects}
          className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
        />
      </div>
      {/* Info: (20240715 - Julian) iSunFA (hours) */}
      <div className="flex w-full flex-1 flex-col items-start gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('salary:SALARY.ISUNFA_HOURS')}
        </p>
        <NumericInput
          id="input-isunfa-hours"
          value={isunfaHours}
          setValue={setIsunfaHours}
          className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
          isDecimal
        />
      </div>
      {/* Info: (20240715 - Julian) Routine work (hours) */}
      <div className="flex w-full flex-1 flex-col items-start gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('salary:SALARY.ROUTINE_WORK_HOURS')}
        </p>
        <NumericInput
          id="input-routine-work-hours"
          value={routineWorkHours}
          setValue={setRoutineWorkHours}
          className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
          isDecimal
        />
      </div>
    </div>
  ) : (
    <div className="my-20px flex items-center gap-x-8px text-base text-text-brand-secondary-lv2">
      <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
      <p>{t('salary:SALARY.WORKING_HOURS_PERIOD', { workingHours })}</p>
    </div>
  );

  return (
    <form className="mt-40px flex flex-col" onSubmit={submitHandler}>
      {/* Info: (20240715 - Julian) Divider */}
      <div className="flex items-center gap-4 font-medium">
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/record.svg" width={16} height={16} alt="record_icon" />
          <p>{t('salary:SALARY.CREATE_NEW_PAYROLL_RECORDS')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240715 - Julian) Main Form */}
      <div className="mt-40px flex flex-col gap-y-24px md:gap-y-40px">
        {/* Info: (20240715 - Julian) First Column */}
        <div className="flex flex-col items-end gap-x-16px gap-y-24px md:flex-row">
          {/* Info: (20240715 - Julian) Date */}
          <div className="flex w-full flex-col items-start gap-8px md:w-240px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('common:DATE_PICKER.DATE')}
            </p>
            <DatePicker
              period={datePeriod}
              setFilteredPeriod={setDatePeriod}
              type={DatePickerType.TEXT_DATE}
            />
          </div>
          {/* Info: (20240715 - Julian) Departments */}
          <div className="relative flex w-full flex-col items-start gap-8px md:w-200px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('common:COMMON.DEPARTMENTS')}
            </p>
            <div
              id="dropdown-department"
              onClick={departmentToggleHandler}
              className={`flex w-full items-center rounded-sm border bg-input-surface-input-background px-12px py-10px ${isDepartmentVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} hover:cursor-pointer hover:border-input-stroke-selected`}
            >
              <p className="flex-1 text-text-brand-secondary-lv3">{selectedDepartment}</p>
              <FaChevronDown />
              {/* ToDo: (20240715 - Julian) [Beta] Dropdown */}
            </div>

            {departmentMenu}
          </div>
          {/* Info: (20240715 - Julian) Employee */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('common:COMMON.EMPLOYEE')}
            </p>
            <input
              id="input-employee-name"
              type="text"
              className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none placeholder:text-input-text-input-placeholder"
              value={employeeName}
              onChange={nameChangeHandler}
              placeholder={t('common:COMMON.EMPLOYEE_NAME')}
              required
            />
          </div>
        </div>
        {/* Info: (20240715 - Julian) Second Column */}
        <div className="flex flex-col items-end gap-x-60px gap-y-24px md:flex-row">
          {/* Info: (20240715 - Julian) Salary */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('salary:SALARY.SALARY')}
            </p>
            <NumericInput
              id="input-salary-amount"
              value={salaryAmount}
              setValue={setSalaryAmount}
              className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
              required
              isDecimal
            />
          </div>
          {/* Info: (20240715 - Julian) Bonus */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('salary:SALARY.BONUS')}
            </p>
            <NumericInput
              id="input-bonus-amount"
              value={bonusAmount}
              setValue={setBonusAmount}
              className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none"
              required
              isDecimal
            />
          </div>
        </div>
        {/* Info: (20240715 - Julian) Third Column */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('salary:SALARY.INSURANCE_PAYMENTS')}
          </p>
          <div className="flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <NumericInput
              id="input-insurance-payments"
              value={insurancePayments}
              setValue={setInsurancePayments}
              isDecimal
              required
              className="flex-1 bg-transparent px-10px outline-none"
            />
            <div className="flex items-center gap-4px p-12px text-sm text-icon-surface-single-color-primary">
              <svg
                width="21"
                height="20"
                viewBox="0 0 21 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.80709 1.75098L4.83659 1.75098H5.16992L5.20238 1.75098C6.10828 1.75097 6.83385 1.75097 7.42032 1.79888C8.02254 1.84809 8.54385 1.95153 9.02372 2.19603C9.6159 2.49777 10.1227 2.93802 10.5033 3.47581C10.8838 2.93802 11.3906 2.49777 11.9828 2.19603C12.4627 1.95153 12.984 1.84809 13.5862 1.79888C14.1727 1.75097 14.8982 1.75097 15.8041 1.75098L15.8366 1.75098H16.1699L16.1994 1.75098C16.641 1.75096 17.017 1.75095 17.3257 1.77618C17.65 1.80267 17.9655 1.8607 18.2671 2.01438C18.7218 2.24607 19.0915 2.61578 19.3232 3.0705C19.4769 3.37211 19.5349 3.68761 19.5614 4.01191C19.5866 4.3206 19.5866 4.69657 19.5866 5.13812V5.16764V12.3343V12.3638C19.5866 12.8054 19.5866 13.1814 19.5614 13.49C19.5349 13.8143 19.4769 14.1298 19.3232 14.4315C19.0915 14.8862 18.7218 15.2559 18.2671 15.4876C17.9655 15.6413 17.65 15.6993 17.3257 15.7258C17.017 15.751 16.641 15.751 16.1994 15.751H16.1699H15.0242C13.934 15.751 13.5451 15.7586 13.2032 15.8625C12.8782 15.9611 12.5759 16.1229 12.3136 16.3386C12.0375 16.5655 11.8154 16.8848 11.2107 17.7919L11.1273 17.917C10.9882 18.1257 10.754 18.251 10.5033 18.251C10.2525 18.251 10.0183 18.1257 9.87922 17.917L9.79584 17.7919C9.19107 16.8848 8.969 16.5655 8.69296 16.3386C8.43059 16.1229 8.12828 15.9611 7.80332 15.8625C7.46142 15.7586 7.07255 15.751 5.98228 15.751H4.83659H4.80712C4.36555 15.751 3.98955 15.751 3.68085 15.7258C3.35655 15.6993 3.04106 15.6413 2.73945 15.4876C2.28472 15.2559 1.91502 14.8862 1.68332 14.4315C1.52965 14.1298 1.47162 13.8143 1.44512 13.49C1.4199 13.1814 1.41991 12.8054 1.41992 12.3638L1.41992 12.3343V5.16764L1.41992 5.13814C1.41991 4.69658 1.4199 4.3206 1.44512 4.01191C1.47162 3.68761 1.52965 3.37211 1.68332 3.0705C1.91502 2.61578 2.28472 2.24607 2.73945 2.01438C3.04106 1.8607 3.35655 1.80267 3.68085 1.77618C3.98955 1.75095 4.36553 1.75096 4.80709 1.75098ZM9.75326 7.83431C9.75326 6.88851 9.75267 6.22427 9.71033 5.70606C9.66871 5.1966 9.5905 4.89467 9.47169 4.6615C9.22402 4.17542 8.82882 3.78022 8.34273 3.53254C8.10956 3.41374 7.80764 3.33553 7.29818 3.2939C6.77996 3.25156 6.11572 3.25098 5.16992 3.25098H4.83659C4.3575 3.25098 4.0433 3.25156 3.803 3.27119C3.57146 3.29011 3.47534 3.32291 3.42043 3.35089C3.24795 3.43877 3.10772 3.579 3.01983 3.75149C2.99186 3.8064 2.95906 3.90252 2.94014 4.13405C2.92051 4.37435 2.91992 4.68856 2.91992 5.16764V12.3343C2.91992 12.8134 2.92051 13.1276 2.94014 13.3679C2.95906 13.5994 2.99186 13.6956 3.01983 13.7505C3.10772 13.923 3.24795 14.0632 3.42043 14.1511C3.47534 14.179 3.57146 14.2118 3.803 14.2308C4.0433 14.2504 4.3575 14.251 4.83659 14.251H5.98228C6.02102 14.251 6.05926 14.251 6.09699 14.251C7.02997 14.2507 7.65738 14.2505 8.2392 14.4272C8.75284 14.5832 9.23069 14.8389 9.64539 15.1797C9.68204 15.2099 9.71795 15.2408 9.75326 15.2727V7.83431ZM11.2533 15.2727C11.2886 15.2408 11.3245 15.2099 11.3611 15.1797C11.7758 14.8389 12.2537 14.5832 12.7673 14.4272C13.3491 14.2505 13.9765 14.2507 14.9095 14.251C14.9473 14.251 14.9855 14.251 15.0242 14.251H16.1699C16.649 14.251 16.9632 14.2504 17.2035 14.2308C17.4351 14.2118 17.5312 14.179 17.5861 14.1511C17.7586 14.0632 17.8988 13.923 17.9867 13.7505C18.0147 13.6956 18.0475 13.5994 18.0664 13.3679C18.086 13.1276 18.0866 12.8134 18.0866 12.3343V5.16764C18.0866 4.68856 18.086 4.37435 18.0664 4.13405C18.0475 3.90252 18.0147 3.8064 17.9867 3.75149C17.8988 3.579 17.7586 3.43877 17.5861 3.35089C17.5312 3.32291 17.4351 3.29011 17.2035 3.27119C16.9632 3.25156 16.649 3.25098 16.1699 3.25098H15.8366C14.8908 3.25098 14.2266 3.25156 13.7083 3.2939C13.1989 3.33553 12.8969 3.41374 12.6638 3.53254C12.1777 3.78022 11.7825 4.17542 11.5348 4.6615C11.416 4.89467 11.3378 5.1966 11.2962 5.70606C11.2538 6.22427 11.2533 6.88851 11.2533 7.83431V15.2727Z"
                  fill="#314362"
                />
              </svg>
            </div>
          </div>
        </div>
        {/* Info: (20240715 - Julian) Fourth Column */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('common:COMMON.DESCRIPTION')}
          </p>
          <input
            id="input-description"
            value={description}
            onChange={descriptionChangeHandler}
            required
            className="h-44px w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
      </div>
      {/* Info: (20240715 - Julian) Divider */}
      <div className="mt-20px flex items-center gap-4 font-medium">
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/work.svg" width={16} height={16} alt="work_icon" />
          <p>{t('salary:SALARY.WORKING_HOURS_ALONE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240716 - Julian) Working Hours */}
      <div className="mt-40px flex flex-col gap-y-40px">
        {/* Info: (20240716 - Julian) Toggle */}
        <div className="flex flex-col gap-y-8px">
          <div className="flex items-center gap-x-16px text-switch-text-primary">
            <p>{t('salary:SALARY.RECORD_WORKING_HOURS')}</p>
            <Toggle
              id="toggle-record-working-hours"
              initialToggleState={isRecordWorkingHours}
              getToggledState={recordWorkingHoursHandler}
            />
          </div>
          <p className="text-xs text-text-brand-secondary-lv2">
            {t('salary:SALARY.DESCRIPTION_OF_WORKING_HOURS')}
          </p>
        </div>
        {/* Info: (20240716 - Julian) Inputs */}
        {workingHoursPart}
      </div>
      {/* Info: (20240715 - Julian) Hours */}
      <div className="ml-auto mt-20px flex items-center gap-24px">
        <Button type="button" variant={null} onClick={cancelHandler}>
          {t('common:COMMON.CANCEL')}
        </Button>
        <Button type="submit" variant="default" disabled={disableSubmit}>
          {t('common:CONTACT_US.SUBMIT')}
        </Button>
      </div>
    </form>
  );
};

export default SalaryRecordForm;
