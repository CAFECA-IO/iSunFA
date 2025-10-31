import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { PiUserFill } from 'react-icons/pi';
import { RxCross2 } from 'react-icons/rx';
import { IEmployeeForCalc } from '@/interfaces/employees';
import { Button } from '@/components/button/button';
import AmountInput from '@/components/salary_calculator/amount_input';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';

interface IEmployeeActionModalProps {
  type: 'add' | 'edit';
  data: IEmployeeForCalc | null;
  modalVisibleHandler: () => void;
}

const EmployeeActionModal: React.FC<IEmployeeActionModalProps> = ({
  type,
  data,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation(['calculator', 'common']);
  const { toastHandler } = useModalContext();

  // Info: (20250715 - Julian) 編輯時應有預設值，新增時則為空
  const defaultName = data?.name || '';
  const defaultNumber = data?.number || '';
  const defaultBaseSalary = data?.baseSalary || 0;
  const defaultMealAllowance = data?.mealAllowance || 0;
  const defaultEmail = data?.email || '';

  const [nameInput, setNameInput] = useState<string>(defaultName);
  const [numberInput, setNumberInput] = useState<string>(defaultNumber);
  const [baseSalaryInput, setBaseSalaryInput] = useState<number>(defaultBaseSalary);
  const [mealAllowanceInput, setMealAllowanceInput] = useState<number>(defaultMealAllowance);
  const [emailInput, setEmailInput] = useState<string>(defaultEmail);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const submitDisabled = !nameInput || !emailInput || !isEmailValid || baseSalaryInput === 0;

  // Info: (20250715 - Julian) 根據 type 設定標題文字
  const titleStr =
    type === 'add'
      ? t('calculator:EMPLOYEE_LIST.ADD_EMPLOYEE')
      : t('calculator:EMPLOYEE_LIST.EDIT_EMPLOYEE');

  const changeNameHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
  };
  const changeNumberHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberInput(e.target.value);
  };
  const changeEmailHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmailInput(email);

    // Info: (20250715 - Julian) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));
  };

  const addEmployee = () => {
    // ToDo: (20250715 - Julian) Add employee API call logic here
    // eslint-disable-next-line no-console
    console.log('Employee added:', {
      name: nameInput,
      number: numberInput,
      baseSalary: baseSalaryInput,
      mealAllowance: mealAllowanceInput,
      email: emailInput,
    });

    // Info: (20250715 - Julian) 顯示成功提示
    toastHandler({
      id: 'employee-add-success',
      type: ToastType.SUCCESS,
      content: t('calculator:EMPLOYEE_LIST.ADD_SUCCESS_TOAST'),
      closeable: true,
    });
  };

  const editEmployee = () => {
    // ToDo: (20250715 - Julian) Edit employee API call logic here
    // eslint-disable-next-line no-console
    console.log('Employee edited:', {
      id: data?.id,
      name: nameInput,
      number: numberInput,
      baseSalary: baseSalaryInput,
      mealAllowance: mealAllowanceInput,
      email: emailInput,
    });

    // Info: (20250715 - Julian) 顯示成功提示
    toastHandler({
      id: 'employee-edit-success',
      type: ToastType.SUCCESS,
      content: t('calculator:EMPLOYEE_LIST.EDIT_SUCCESS_TOAST'),
      closeable: true,
    });
  };

  const submitHandler = () => {
    if (type === 'add') {
      addEmployee();
    } else if (type === 'edit' && data) {
      editEmployee();
    }
    modalVisibleHandler();
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-450px">
        {/* Info: (20250715 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">{titleStr}</h2>
          <button type="button" onClick={modalVisibleHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
          </button>
        </div>
        {/* Info: (20250715 - Julian) Modal Body */}
        <div className="flex flex-col gap-24px px-40px py-24px">
          {/* Info: (20250715 - Julian) Employee Name Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:EMPLOYEE_LIST.NAME')} <span className="text-text-state-error">*</span>
            </p>
            <div className="flex items-center rounded-sm border border-input-stroke-input">
              <div className="p-10px text-text-neutral-tertiary">
                <PiUserFill size={16} />
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={changeNameHandler}
                className="flex-1 bg-transparent px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NAME_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Employee Number Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:EMPLOYEE_LIST.NUMBER')}
            </p>
            <div className="flex items-center rounded-sm border border-input-stroke-input">
              <input
                type="text"
                value={numberInput}
                onChange={changeNumberHandler}
                className="flex-1 bg-transparent px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NUMBER_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Base Salary Input */}
          <div className="flex flex-col gap-8px">
            <AmountInput
              title={t('calculator:BASE_PAY_FORM.BASE_SALARY')}
              value={baseSalaryInput}
              setValue={setBaseSalaryInput}
              minimum={0}
              required
            />
          </div>
          {/* Info: (20250715 - Julian) Meal Allowance Input */}
          <div className="flex flex-col gap-8px">
            <AmountInput
              title={t('calculator:BASE_PAY_FORM.MEAL_ALLOWANCE')}
              value={mealAllowanceInput}
              setValue={setMealAllowanceInput}
              minimum={0}
            />
          </div>
          {/* Info: (20250715 - Julian) Email Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:EMPLOYEE_LIST.EMAIL')} <span className="text-text-state-error">*</span>
            </p>
            <div
              className={`flex items-center rounded-sm border ${isEmailValid ? 'border-input-stroke-input' : 'border-text-state-error text-input-text-error'}`}
            >
              <input
                type="text"
                value={emailInput}
                onChange={changeEmailHandler}
                className="flex-1 bg-transparent px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.EMAIL_PLACEHOLDER')}
              />
            </div>
            <p
              className={`text-right text-sm font-medium text-text-state-error ${isEmailValid ? 'opacity-0' : 'opacity-100'}`}
            >
              {t('calculator:EMPLOYEE_LIST.EMAIL_VALID')}
            </p>
          </div>
        </div>
        {/* Info: (20250715 - Julian) Modal Footer */}
        <div className="flex items-center gap-12px px-20px py-16px">
          <Button className="w-full" variant="tertiaryOutline" onClick={modalVisibleHandler}>
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            className="w-full"
            variant="tertiary"
            disabled={submitDisabled}
            onClick={submitHandler}
          >
            <FaPlus size={16} />
            <p>{t('calculator:EMPLOYEE_LIST.ADD_EMPLOYEE')}</p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeActionModal;
