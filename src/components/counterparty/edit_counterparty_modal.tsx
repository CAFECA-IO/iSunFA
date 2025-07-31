import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { CounterpartyType } from '@/constants/counterparty';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { FaChevronDown } from 'react-icons/fa6';
import { inputStyle } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import loggerFront from '@/lib/utils/logger_front';

interface EditCounterPartyModalProps {
  onClose: () => void;
  onSave: (counterpartyData: {
    id: number;
    name: string;
    taxId: string;
    type: CounterpartyType;
    note: string;
  }) => void;
  name?: string;
  taxId?: string;
  note?: string;
  counterpartyId: number; // Info: (20241110 - Anna) 新增 counterpartyId 属性
  type?: CounterpartyType; // Info: (20241111 - Anna) 添加 type 作為可選屬性
}

const EditCounterPartyModal: React.FC<EditCounterPartyModalProps> = ({
  onSave,
  onClose,
  name,
  taxId,
  note = '', // Info: (20241108 - Anna) 設置 note 的預設值
  type = CounterpartyType.BOTH, // Info: (20241111 - Anna)  預設為 BOTH
  counterpartyId, // Info: (20241110 - Anna) 傳入 counterpartyId
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { connectedAccountBook } = useUserCtx();
  const [inputName, setInputName] = useState<string>(name || '');
  const [inputTaxId, setInputTaxId] = useState<string>(taxId || '');

  // Info: (20241111 - Anna)設定 inputType 的初始值避免 null 類型錯誤
  const [inputType, setInputType] = useState<CounterpartyType>(type); // Info: (20241111 - Anna) 據初始 type 設置
  const [inputNote, setInputNote] = useState<string>(note); // Info: (20241108 - Anna) 使用初始值設置 inputNote
  const [showHint, setShowHint] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // Info: (20241111 - Anna) 新增 hasChanges 狀態

  useEffect(() => {
    // Info: (20241108 - Anna) 檢查是否有任何更動
    setHasChanges(
      inputName !== name || inputTaxId !== taxId || inputType !== type || inputNote !== note
    );
  }, [inputName, inputTaxId, inputType, inputNote, name, taxId, type, note]);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectTypeHandler = () => setTypeMenuOpen(!isTypeMenuOpen);

  const typeItems = [CounterpartyType.BOTH, CounterpartyType.CLIENT, CounterpartyType.SUPPLIER].map(
    (optionType) => {
      const accountClickHandler = () => {
        setInputType(optionType);
        setTypeMenuOpen(false);
      };

      return (
        <button
          key={optionType}
          type="button"
          onClick={accountClickHandler}
          className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
        >
          <p className="text-dropdown-text-secondary">
            {t(`certificate:COUNTERPARTY.${optionType.toUpperCase()}`)}
          </p>
        </button>
      );
    }
  );

  const displayedTypeMenu = (
    <div
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isTypeMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {typeItems}
      </div>
    </div>
  );

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };

  const taxIdChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputTaxId(event.target.value);
  };

  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  const disabled = !inputName || !inputType;

  const {
    trigger: editCounterpartyTrigger,
    success,
    error: editError, // Info: (20241115 - Anna) 更名 `error` 為 `editError`
  } = APIHandler(
    APIName.COUNTERPARTY_UPDATE,
    {
      params: { companyId: connectedAccountBook?.id, counterpartyId },
      body: { name: inputName, taxId: inputTaxId, type: inputType, note: inputNote },
    },
    false,
    true
  );

  const {
    trigger: deleteCounterpartyTrigger,
    success: deleteSuccess,
    error: deleteError,
  } = APIHandler(
    APIName.COUNTERPARTY_DELETE,
    {
      params: { companyId: connectedAccountBook?.id || 0, counterpartyId },
    },
    false,
    true
  );
  // Info: (20241115 - Anna) 使用 useEffect 來監聽 success 狀態，自動更新列表
  useEffect(() => {
    if (success) {
      onSave({
        id: counterpartyId,
        name: inputName,
        taxId: inputTaxId,
        type: inputType,
        note: inputNote,
      });
      onClose();
    }
  }, [success, editError, onSave, onClose, inputName, inputTaxId, inputType, inputNote]);

  // Info: (20241115 - Anna) 新增 useEffect 監聽 deleteSuccess 狀態，自動更新列表
  useEffect(() => {
    if (deleteSuccess) {
      // Info: (20241118 - Anna) 回傳空資料表示該項目已刪除
      onSave({ id: counterpartyId, name: '', taxId: '', type: CounterpartyType.BOTH, note: '' });
      onClose();
    }
  }, [deleteSuccess, deleteError, onSave, onClose, counterpartyId]);

  // Info: (20241111 - Anna) 添加 deleteCounterpartyHandler 函數以處理刪除交易夥伴
  const deleteCounterpartyHandler = () => {
    messageModalDataHandler({
      title: t('certificate:COUNTERPARTY.REMOVE_COUNTERPARTY'),
      content: (
        <Trans
          i18nKey="certificate:COUNTERPARTY.CHECK_REMOVE_COUNTERPARTY"
          values={{ counterparty: inputName }}
          components={{ strong: <span className="font-semibold" /> }}
        />
      ),
      messageType: MessageType.WARNING,
      submitBtnStr: t('settings:SETTINGS.REMOVE'),
      submitBtnClassName:
        'bg-orange-400 text-orange-900 hover:bg-button-surface-strong-primary-hover',
      submitBtnFunction: async () => {
        try {
          await deleteCounterpartyTrigger(); // Info: (20241115 - Anna) 呼叫 deleteCounterpartyTrigger 以執行刪除
        } catch (error) {
          loggerFront.error('Error deleting counterparty:', error);
        }
      },
      backBtnStr: t('common:COMMON.CANCEL'),
      backBtnClassName: 'border-orange-500 text-orange-600',
    });
    messageModalVisibilityHandler();
  };

  const editCounterparty = async () => {
    if (!hasChanges) return; // Info: (20241118 - Anna) 判斷是否有更動
    try {
      const response = await editCounterpartyTrigger();
      if (response.success) {
        toastHandler({
          id: ToastId.UPDATE_COUNTERPARTY_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('certificate:COUNTERPARTY.COUNTERPARTY_SUCCESSFULLY_CHANGED'),
          closeable: true,
        });

        onSave({
          id: counterpartyId,
          name: inputName,
          taxId: inputTaxId,
          type: inputType,
          note: inputNote,
        });
        onClose();
      }
    } catch (error) {
      loggerFront.error('Error updating counterparty:', error);
    }
  };

  const EditNewCounterParterHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) {
      setShowHint(true);
    } else {
      await editCounterparty(); // Info: (20241111 - tzuhan) 呼叫無參數的 editCounterparty
    }
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex max-h-700px w-90vw max-w-480px flex-col gap-lv-5 rounded-sm bg-surface-neutral-surface-lv2 p-lv-7">
        <div className="relative flex items-center justify-center">
          {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
          <button
            type="button"
            className="absolute right-0 text-checkbox-text-primary"
            onClick={onClose}
          >
            <RxCross1 size={24} />
          </button>
          <h2 className="flex justify-center text-xl font-semibold text-text-neutral-primary">
            {t('certificate:COUNTERPARTY.EDIT_NEW')}
          </h2>
        </div>
        <form
          onSubmit={EditNewCounterParterHandler}
          className="flex w-full flex-col gap-lv-7 text-sm text-input-text-primary"
        >
          <div className="flex flex-col gap-4 tablet:gap-lv-7">
            {/* Info: (20241018 - tzuhan) name */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterparty-name" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.COMPANY_NAME')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-parter-name"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NAME')}
                  value={inputName}
                  onChange={nameChangeHandler}
                  required
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Tax Id */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterpart-taxid" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.TAX_NUMBER')}
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-parter-tax-id"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NUMBER')}
                  value={inputTaxId}
                  onChange={taxIdChangeHandler}
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Partner Type */}
            <div ref={typeMenuRef} className="flex w-full flex-col items-start gap-2">
              <p className="font-semibold">
                {t('certificate:COUNTERPARTY.PARTNER_TYPE')}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                onClick={selectTypeHandler}
                className={`relative flex w-full items-center justify-between gap-8px rounded-sm border ${
                  showHint && !inputType ? inputStyle.ERROR : inputStyle.NORMAL
                } bg-input-surface-input-background px-10px py-12px hover:cursor-pointer`}
              >
                <p className="text-input-text-input-filled">
                  {inputType
                    ? t(`certificate:COUNTERPARTY.${inputType.toUpperCase()}`)
                    : t('certificate:COUNTERPARTY.BOTH')}
                </p>
                <div className={isTypeMenuOpen ? 'rotate-180' : 'rotate-0'}>
                  <FaChevronDown />
                </div>
                {displayedTypeMenu}
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('certificate:COUNTERPARTY:NOTE')}</p>
              <input
                id="input-parter-note"
                type="text"
                placeholder={t('certificate:COUNTERPARTY.ENTER_TEXT')}
                value={inputNote}
                onChange={noteChangeHandler}
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
          </div>
          {/* Info: (20241111 - Anna) 绑定删除操作 */}
          <div
            className="flex cursor-pointer items-center justify-start gap-lv-1"
            onClick={deleteCounterpartyHandler}
          >
            <RiDeleteBinLine className="text-red-600" />
            <p className="text-red-600">{t('certificate:COUNTERPARTY.REMOVE_THIS')}</p>
          </div>
          <div className="flex items-center justify-end gap-24px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={onClose}
              variant="secondaryBorderless"
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button
              className="px-16px py-8px"
              type="submit"
              variant="tertiary"
              // Info: (20241111 - Anna) 保存按鈕根據 hasChanges 狀態啟用
              disabled={!hasChanges}
            >
              <p>{t('common:COMMON.SAVE')}</p>
              <BiSave size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCounterPartyModal;
