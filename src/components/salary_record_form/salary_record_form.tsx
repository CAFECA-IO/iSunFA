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
import { LuBookOpen } from 'react-icons/lu';

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
              {t('common:COMMON.DATE')}
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
              <LuBookOpen size={20} />
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
