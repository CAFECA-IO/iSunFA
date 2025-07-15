import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { PiUserFill } from 'react-icons/pi';
import { RxCross2 } from 'react-icons/rx';
import { IEmployeeForCalc } from '@/interfaces/employees';
import { Button } from '@/components/button/button';

interface IEmployeeActionModalProps {
  type: 'add' | 'edit';
  data?: IEmployeeForCalc;
  modalVisibleHandler: () => void;
}

const EmployeeActionModal: React.FC<IEmployeeActionModalProps> = ({
  type,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation(['calculator', 'common']);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEmailValid, setIsEmailValid] = useState(true);

  const titleStr =
    type === 'add'
      ? t('calculator:EMPLOYEE_LIST.ADD_EMPLOYEE')
      : t('calculator:EMPLOYEE_LIST.EDIT_EMPLOYEE');

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
            <div className="flex items-center rounded-sm border border-input-text-input-placeholder">
              <div className="p-10px text-text-neutral-tertiary">
                <PiUserFill size={16} />
              </div>
              <input
                type="text"
                className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NAME_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Employee Number Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:EMPLOYEE_LIST.NUMBER')}
            </p>
            <div className="flex items-center rounded-sm border border-input-text-input-placeholder">
              <input
                type="text"
                className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NUMBER_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Base Salary Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:BASE_PAY_FORM.BASE_SALARY')}{' '}
              <span className="text-text-state-error">*</span>
            </p>
            <div className="flex items-center rounded-sm border border-input-text-input-placeholder">
              <input
                type="text"
                className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NUMBER_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Meal Allowance Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:BASE_PAY_FORM.MEAL_ALLOWANCE')}
            </p>
            <div className="flex items-center rounded-sm border border-input-text-input-placeholder">
              <input
                type="text"
                className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
                placeholder={t('calculator:EMPLOYEE_LIST.NUMBER_PLACEHOLDER')}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Email Input */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('calculator:EMPLOYEE_LIST.EMAIL')} <span className="text-text-state-error">*</span>
            </p>
            <div className="flex items-center rounded-sm border border-input-text-input-placeholder">
              <input
                type="text"
                className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
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
          <Button className="w-full" variant="tertiary">
            <FaPlus size={16} />
            <p>{t('calculator:EMPLOYEE_LIST.ADD_EMPLOYEE')}</p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeActionModal;
