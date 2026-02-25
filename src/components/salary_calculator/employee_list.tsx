"use client";

import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { Search, User, Hash, Mail, Plus, Edit, Trash } from "lucide-react";
import { IEmployeeForCalc, dummyEmployeeForCalc } from "@/interfaces/employees";
// import Pagination from '@/components/pagination/pagination';
// import { useModalContext } from '@/contexts/modal_context';
// import { MessageType } from '@/interfaces/message_modal';
import EmployeeActionModal from "@/components/salary_calculator/employee_action_modal";

const cellStyle =
  "table-cell align-middle border-b border-stroke-neutral-quaternary px-24px py-12px";

const EmployeeItem: React.FC<{
  employee: IEmployeeForCalc;
  editHandler: (employee: IEmployeeForCalc) => void;
}> = ({ employee, editHandler }) => {
  // const { t } = useTranslation();

  const { /* id, */ name, number, email } = employee;

  // ToDo: (20260224 - Julian) =========== 這裡要實作 Modal 和 Pagination
  // const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();

  // const deleteEmployee = () => {
  //   // ToDo: (20250715 - Julian) Delete employee API
  //   // eslint-disable-next-line no-console
  //   console.log('Delete employee:', id);
  // };

  const clickEditHandler = () => {
    editHandler(employee);
  };

  const clickDeleteHandler = () => {
    // messageModalDataHandler({
    //   messageType: MessageType.WARNING,
    //   title: t('calculator.employee_list.remove_employee_title'),
    //   content: t('calculator.employee_list.remove_employee_content', { name }),
    //   submitBtnStr: t('calculator.employee_list.remove_employee_submit_btn'),
    //   submitBtnFunction: () => {
    //     deleteEmployee();
    //     messageModalVisibilityHandler();
    //   },
    // });
    // messageModalVisibilityHandler();
  };

  return (
    <div className="table-row">
      {/* Info: (20250715 - Julian) Name */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <User size={16} className="text-text-neutral-tertiary" /> {name}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Number */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <Hash size={16} className="text-text-neutral-tertiary" /> {number}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Email */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <Mail size={16} className="text-text-neutral-tertiary" /> {email}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Action buttons */}
      <div className={`${cellStyle} w-100px`}>
        <div className="flex items-center gap-8px">
          {/* Info: (20250715 - Julian) Edit button */}
          <button
            type="button"
            onClick={clickEditHandler}
            className="p-10px text-button-text-secondary hover:text-button-stroke-primary-hover"
          >
            <Edit size={16} />
          </button>
          {/* Info: (20250715 - Julian) Delete button */}
          <button
            type="button"
            onClick={clickDeleteHandler}
            className="p-10px text-button-text-secondary hover:text-button-stroke-primary-hover"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const EmployeeList: React.FC = () => {
  const { t } = useTranslation();

  const employeeList = dummyEmployeeForCalc;

  const [keyword, setKeyword] = useState<string>("");
  // Info: (20250715 - Julian) 操作 Modal 類型，'add' 為新增員工，'edit' 為編輯員工
  const [action, setAction] = useState<"add" | "edit">("add");
  const [dataToEdit, setDataToEdit] = useState<IEmployeeForCalc | null>(null);
  const [isShowModal, setIsShowModal] = useState<boolean>(false);
  // const [currentPage, setCurrentPage] = useState<number>(0);
  // ToDo: (20250715 - Julian) Get total pages from API
   
  // const [totalPages, setTotalPages] = useState<number>(0);

  const changeKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const clickAddEmployeeHandler = () => {
    setAction("add");
    setDataToEdit(null);
    setIsShowModal(true);
  };

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);

  const displayedEmployees = employeeList.map((employee) => {
    // Info: (20250715 - Julian) 將資料寫入 dataToEdit ，並開啟 Modal 以編輯員工資料
    const editHandler = (employeeToEdit: IEmployeeForCalc) => {
      setAction("edit");
      setDataToEdit(employeeToEdit);
      setIsShowModal(true);
    };

    return (
      <EmployeeItem
        key={employee.id}
        employee={employee}
        editHandler={editHandler}
      />
    );
  });

  return (
    <>
      <div className="flex flex-col items-center gap-24px">
        <div className="flex w-full items-center gap-40px">
          {/* Info: (20250715 - Julian) Search bar */}
          <div className="flex flex-1 items-center rounded-sm border border-input-stroke-input">
            <div className="px-12px py-10px text-icon-surface-single-color-primary">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={changeKeyword}
              placeholder={t("calculator.employee_list.search_placeholder")}
              className="flex-1 bg-transparent px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>

          {/* Info: (20250715 - Julian) Add New Employee button */}
          <button onClick={clickAddEmployeeHandler}>
            <Plus size={16} />
            <p>{t("calculator.employee_list.add_employee")}</p>
          </button>
        </div>

        {/* Info: (20250715 - Julian) Employee List */}
        <div className="table w-full bg-surface-neutral-surface-lv2 text-sm font-medium text-text-neutral-secondary">
          <div className="table-header-group">
            <div className="table-row">
              <div className={`${cellStyle}`}>
                {t("calculator.employee_list.name")}
              </div>
              <div className={`${cellStyle}`}>
                {t("calculator.employee_list.number")}
              </div>
              <div className={`${cellStyle}`}>
                {t("calculator.employee_list.email")}
              </div>
              <div className={`${cellStyle}`}>
                {t("calculator.employee_list.action")}
              </div>
            </div>
          </div>
          <div className="table-row-group">{displayedEmployees}</div>
        </div>
        {/* Info: (20250715 - Julian) Pagination */}
        {/* <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        /> */}
      </div>

      {/* Info: (20250715 - Julian) Add/Edit Employee Modal */}
      {isShowModal && (
        <EmployeeActionModal
          type={action}
          data={dataToEdit}
          modalVisibleHandler={modalVisibleHandler}
        />
      )}
    </>
  );
};

export default EmployeeList;
