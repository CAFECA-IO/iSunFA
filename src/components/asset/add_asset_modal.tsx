import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { BiSave } from 'react-icons/bi';
import { RxCross2 } from 'react-icons/rx';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import NumericInput from '@/components/numeric_input/numeric_input';
import { IDatePeriod } from '@/interfaces/date_period';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IAccount } from '@/interfaces/accounting_account';
import { useModalContext } from '@/contexts/modal_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import { ToastId } from '@/constants/toast_id';
import { default30DayPeriodInSec, inputStyle } from '@/constants/display';
import { AccountCodesOfAsset } from '@/constants/asset';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID } from '@/constants/config';

interface IAddAssetModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

enum DepreciationMethod {
  STRAIGHT_LINE = 'Straight line method',
  DOUBLE_DECLINING = 'Double declining balance method',
  SUM_OF_YEAR_DIGIT = 'Sum of the year digit method',
}

const AddAssetModal: React.FC<IAddAssetModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { accountList } = useAccountingCtx();
  const { selectedCompany } = useUserCtx();

  const { trigger, success, isLoading, error } = APIHandler(APIName.ASSET_GET_BY_ID_V2);

  // Info: (20241025 - Julian) 取得資產相關的會計科目
  const assetAccountList = accountList.filter((account) => {
    return AccountCodesOfAsset.includes(account.code);
  });

  const accountInputRef = useRef<HTMLInputElement>(null);

  // Info: (20241015 - Julian) Accounting 下拉選單
  const {
    targetRef: accountMenuRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241015 - Julian) Account 編輯狀態
  const {
    targetRef: accountRef,
    componentVisible: isAccountEditing,
    setComponentVisible: setIsAccountEditing,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241015 - Julian) Depreciation Method 下拉選單
  const {
    targetRef: methodRef,
    componentVisible: isMethodVisible,
    setComponentVisible: setMethodVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241015 - Julian) Account state
  const [accountTitle, setAccountTitle] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING')
  );
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>(assetAccountList);

  const [inputNo, setInputNo] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<number>(1);
  const [inputResidualValue, setInputResidualValue] = useState<number>(0);
  const [inputTotal, setInputTotal] = useState<number>(0);
  const [acquisitionDate, setAcquisitionDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [depreciationStartDate, setDepreciationStartDate] =
    useState<IDatePeriod>(default30DayPeriodInSec);
  const [inputUsefulLife, setInputUsefulLife] = useState<number>(0);
  const [selectedDepreciationMethod, setSelectedDepreciationMethod] = useState<DepreciationMethod>(
    DepreciationMethod.STRAIGHT_LINE
  );
  const [inputNote, setInputNote] = useState<string>('');

  // Info: (20241015 - Julian) 提示訊息
  const [isShowTypeHint, setIsShowTypeHint] = useState<boolean>(false);
  const [isShowResidualValueHint, setIsShowResidualValueHint] = useState<boolean>(false);
  const [isShowTotalHint, setIsShowTotalHint] = useState<boolean>(false);
  const [isShowAcquisitionDateHint, setIsShowAcquisitionDateHint] = useState<boolean>(false);
  const [isShowDepreciationStartDateHint, setIsShowDepreciationStartDateHint] =
    useState<boolean>(false);
  const [isShowUsefulLifeHint, setIsShowUsefulLifeHint] = useState<boolean>(false);

  // Info: (20241015 - Julian) 判斷是否為 1602 - 土地成本
  const [isLandCost, setIsLandCost] = useState<boolean>(false);

  useEffect(() => {
    if (!isModalVisible) {
      setAccountTitle(t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING'));
      setSearchKeyword('');
      setInputNo('');
      setInputName('');
      setInputAmount(1);
      setInputResidualValue(0);
      setInputTotal(0);
      setAcquisitionDate(default30DayPeriodInSec);
      setDepreciationStartDate(default30DayPeriodInSec);
      setInputUsefulLife(0);
      setSelectedDepreciationMethod(DepreciationMethod.STRAIGHT_LINE);
      setInputNote('');

      setIsShowTypeHint(false);
      setIsShowResidualValueHint(false);
      setIsShowTotalHint(false);
      setIsShowAcquisitionDateHint(false);
      setIsShowDepreciationStartDateHint(false);
      setIsShowUsefulLifeHint(false);
      setIsLandCost(false);
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (accountTitle !== t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING')) {
      setIsShowTypeHint(false);
    }
  }, [accountTitle]);

  useEffect(() => {
    if (inputResidualValue > 0) {
      setIsShowResidualValueHint(false);
    }
  }, [inputResidualValue]);

  useEffect(() => {
    if (inputTotal > 0) {
      setIsShowTotalHint(false);
    }
  }, [inputTotal]);

  useEffect(() => {
    if (acquisitionDate.startTimeStamp > 0) {
      setIsShowAcquisitionDateHint(false);
    }
  }, [acquisitionDate]);

  useEffect(() => {
    if (depreciationStartDate.startTimeStamp > 0) {
      setIsShowDepreciationStartDateHint(false);
    }
  }, [depreciationStartDate]);

  useEffect(() => {
    if (inputUsefulLife > 0) {
      setIsShowUsefulLifeHint(false);
    }
  }, [inputUsefulLife]);

  // Info: (20241015 - Julian) 搜尋 Account
  useEffect(() => {
    const filteredList = assetAccountList.filter((account) => {
      // Info: (20241015 - Julian) 編號(數字)搜尋: 字首符合
      if (searchKeyword.match(/^\d+$/)) {
        const codeMatch = account.code.toLowerCase().startsWith(searchKeyword.toLowerCase());
        return codeMatch;
      } else if (searchKeyword !== '') {
        // Info: (20241015 - Julian) 名稱搜尋: 部分符合
        const nameMatch = account.name.toLowerCase().includes(searchKeyword.toLowerCase());
        return nameMatch;
      }
      return true;
    });
    setFilteredAccountList(filteredList);
  }, [searchKeyword, accountList]);

  useEffect(() => {
    // Info: (20241015 - Julian) 查詢會計科目關鍵字時聚焦
    if (isAccountEditing && accountInputRef.current) {
      accountInputRef.current.focus();
    }

    // Info: (20241015 - Julian) 查詢模式關閉後清除搜尋關鍵字
    if (!isAccountEditing) {
      setSearchKeyword('');
    }
  }, [isAccountEditing]);

  useEffect(() => {
    // Info: (20241021 - Julian) 如果為 1602 - 土地成本，則不需要年限及折舊方法、折舊開始日期
    if (accountTitle.includes('1602')) {
      setIsLandCost(true);
    } else {
      setIsLandCost(false);
    }
  }, [accountTitle]);

  const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setAccountingMenuOpen(true);
  };

  const accountEditingHandler = () => {
    setIsAccountEditing(true);
    setAccountingMenuOpen(true);
  };

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const assetNoChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNo(event.target.value);
  };
  const amountChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241015 - Julian) 限制只能輸入數字，並去掉前面的0
    const amountOnlyNumber = event.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
    setInputAmount(Number(amountOnlyNumber));
  };
  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  const toggleMethodMenu = () => {
    setMethodVisible(!isMethodVisible);
  };

  const addNewAsset = async () => {
    const generalBody = {
      assetName: inputName,
      assetType: accountTitle,
      assetNumber: inputNo,
      acquisitionDate: acquisitionDate.startTimeStamp,
      purchasePrice: inputTotal,
      currencyAlias: 'TWD',
      amount: inputAmount,
      depreciationStart: depreciationStartDate.startTimeStamp,
      depreciationMethod: selectedDepreciationMethod,
      usefulLife: inputUsefulLife,
      note: inputNote,
    };

    // Info: (20241025 - Julian) 土地成本不會有折舊日期、折舊方法和使用年限
    const landBody = {
      assetName: inputName,
      assetType: accountTitle,
      assetNumber: inputNo,
      acquisitionDate: acquisitionDate.startTimeStamp,
      purchasePrice: inputTotal,
      currencyAlias: 'TWD',
      amount: inputAmount,
      note: inputNote,
    };

    trigger({
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      },
      body: isLandCost ? landBody : generalBody,
    });
  };

  useEffect(() => {
    if (!isLoading) {
      if (success) {
        modalVisibilityHandler();

        // Info: (20241025 - Julian) 顯示成功 toast 訊息
        toastHandler({
          id: ToastId.ADD_ASSET_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('asset:ADD_ASSET_MODAL.TOAST_SUCCESS'),
          closeable: true,
        });
      } else if (error) {
        // Info: (20241025 - Julian) 顯示錯誤 toast 訊息
        toastHandler({
          id: ToastId.ADD_ASSET_ERROR,
          type: ToastType.ERROR,
          content: t('asset:ADD_ASSET_MODAL.TOAST_ERROR'),
          closeable: true,
        });
      }
    }
  }, [success, isLoading, error]);

  const addAssetSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (accountTitle === t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING')) {
      // Info: (20241015 - Julian) 顯示提示訊息 & 滾動到最上方
      setIsShowTypeHint(true);
      accountRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (inputTotal === 0) {
      setIsShowTotalHint(true);
    } else if (inputResidualValue === 0) {
      setIsShowResidualValueHint(true);
    } else if (acquisitionDate.startTimeStamp === 0) {
      setIsShowAcquisitionDateHint(true);
    } else if (depreciationStartDate.startTimeStamp === 0 && isLandCost === false) {
      // Info: (20241015 - Julian) 土地成本不需要 Depreciation Start Date
      setIsShowDepreciationStartDateHint(true);
    } else if (inputUsefulLife === 0 && isLandCost === false) {
      //  Info: (20241015 - Julian) 土地成本不需要 Useful Life
      setIsShowUsefulLifeHint(true);
    } else {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('asset:ADD_ASSET_MODAL.CONFIRM_MESSAGE_TITLE'),
        content: t('asset:ADD_ASSET_MODAL.CONFIRM_MESSAGE_CONTENT'),
        backBtnStr: t('common:COMMON.CANCEL'),
        submitBtnStr: t('asset:ADD_ASSET_MODAL.CONFIRM_MESSAGE_BTN'),
        submitBtnFunction: () => {
          addNewAsset();
          modalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const translateMethod = (method: DepreciationMethod) => {
    const key = method.toUpperCase().replace(/ /g, '_');
    return t(`asset:ADD_ASSET_MODAL.${key}`);
  };

  const accountingItems =
    filteredAccountList && filteredAccountList.length > 0 ? (
      filteredAccountList.map((account) => {
        const accountClickHandler = () => {
          setAccountTitle(`${account.code} ${account.name}`);
          // Info: (20241001 - Julian) 關閉 Accounting Menu 和編輯狀態
          setAccountingMenuOpen(false);
          setIsAccountEditing(false);
          // Info: (20241001 - Julian) 重置搜尋關鍵字
          setSearchKeyword('');
        };

        return (
          <button
            key={account.id}
            type="button"
            onClick={accountClickHandler}
            className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
          >
            <p className="text-dropdown-text-primary">{account.code}</p>
            <p className="text-dropdown-text-secondary">{account.name}</p>
          </button>
        );
      })
    ) : (
      <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
        {t('journal:ADD_NEW_VOUCHER.NO_ACCOUNTING_FOUND')}
      </p>
    );

  const displayedAccountingMenu = (
    <div
      ref={accountMenuRef}
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isAccountingMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {accountingItems}
      </div>
    </div>
  );

  const isEditAccounting = isAccountEditing ? (
    <input
      ref={accountInputRef}
      value={searchKeyword}
      onChange={accountSearchHandler}
      placeholder={accountTitle}
      className="w-full truncate bg-transparent outline-none"
    />
  ) : (
    <p className={`truncate text-input-text-input-filled`}>{accountTitle}</p>
  );

  const depreciationMethodList = Object.values(DepreciationMethod);

  const depreciationMethodMenu = depreciationMethodList.map((method) => (
    <button
      key={method}
      type="button"
      onClick={() => {
        setSelectedDepreciationMethod(method as DepreciationMethod);
        setMethodVisible(false);
      }}
      className="flex h-46px w-full items-center justify-between px-12px py-8px text-base font-medium text-input-text-input-filled hover:bg-dropdown-surface-item-hover"
    >
      <p>{translateMethod(method)}</p>
    </button>
  ));

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="flex max-h-450px w-90vw max-w-600px flex-col overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 md:max-h-90vh">
        {/* Info: (20241015 - Julian) title */}
        <div className="relative flex flex-col items-center px-20px py-16px">
          {/* Info: (20241015 - Julian) desktop title */}
          <h1 className="whitespace-nowrap text-xl font-bold text-card-text-primary">
            {t('asset:ADD_ASSET_MODAL.TITLE')}
          </h1>
          <p className="text-sm text-card-text-secondary">{t('asset:ADD_ASSET_MODAL.SUBTITLE')}</p>
          {/* Info: (20241015 - Julian) close button */}
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="absolute right-20px top-16px text-icon-surface-single-color-primary"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Info: (20241015 - Julian) content */}
        <form
          onSubmit={addAssetSubmitHandler}
          className="flex w-full flex-col gap-y-40px px-30px py-24px text-sm text-input-text-primary"
        >
          {/* Info: (20241015 - Julian) input fields */}
          <div className="grid max-h-550px flex-1 grid-cols-1 items-center gap-16px overflow-y-auto overflow-x-hidden px-10px text-center md:grid-cols-2">
            {/* Info: (20241015 - Julian) Asset Type */}
            <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.ASSET_TYPE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <div ref={accountRef} className="relative w-full">
                <div
                  onClick={accountEditingHandler}
                  className={`flex items-center justify-between gap-8px rounded-sm border ${
                    isShowTypeHint ? inputStyle.ERROR : inputStyle.NORMAL
                  } bg-input-surface-input-background px-12px py-10px hover:cursor-pointer`}
                >
                  {isEditAccounting}
                  <FaChevronDown />
                </div>
                {displayedAccountingMenu}
              </div>
            </div>
            {/* Info: (20241015 - Julian) Asset no */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.ASSET_NO')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <input
                id="input-no"
                type="text"
                placeholder={t('asset:ADD_ASSET_MODAL.ASSET_NO_PLACEHOLDER')}
                value={inputNo}
                onChange={assetNoChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Asset name */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.ASSET_NAME')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <input
                id="input-name"
                type="text"
                placeholder={t('asset:ADD_ASSET_MODAL.ASSET_NAME_PLACEHOLDER')}
                value={inputName}
                onChange={nameChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Amount */}
            <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
              <p className="font-semibold">{t('asset:ADD_ASSET_MODAL.AMOUNT')}</p>
              <input
                id="input-amount"
                type="number"
                value={inputAmount}
                onChange={amountChangeHandler}
                min={1}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Total Price */}
            <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.TOTAL_PRICE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                className={`flex h-46px w-full items-center justify-between divide-x ${isShowTotalHint ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
              >
                <NumericInput
                  id="input-total"
                  name="input-total"
                  value={inputTotal}
                  setValue={setInputTotal}
                  isDecimal
                  hasComma
                  required
                  min={1}
                  className="flex-1 bg-transparent px-10px text-right outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('common:COMMON.TWD')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20241021 - Julian) Residual Value */}
            <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.RESIDUAL_VALUE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                className={`flex h-46px w-full items-center justify-between divide-x ${isShowResidualValueHint ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
              >
                <NumericInput
                  id="input-residual-value"
                  name="input-residual-value"
                  value={inputResidualValue}
                  setValue={setInputResidualValue}
                  isDecimal
                  hasComma
                  required
                  min={1}
                  className="flex-1 bg-transparent px-10px text-right outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('common:COMMON.TWD')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20241015 - Julian) Acquisition Date */}
            <div
              className={`flex w-full flex-col items-start gap-y-8px ${isLandCost ? 'md:col-span-2' : ''}`}
            >
              <p className="font-semibold">
                {t('asset:ADD_ASSET_MODAL.ACQUISITION_DATE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                type={DatePickerType.TEXT_DATE}
                period={acquisitionDate}
                setFilteredPeriod={setAcquisitionDate}
                btnClassName={isShowAcquisitionDateHint ? inputStyle.ERROR : ''}
              />
            </div>
            {/* Info: (20241015 - Julian) Depreciation Start Date */}
            {!isLandCost ? (
              <div className="flex w-full flex-col items-start gap-y-8px">
                <p className="font-semibold">
                  {t('asset:ADD_ASSET_MODAL.DEPRECIATION_START_DATE')}{' '}
                  <span className="text-text-state-error">*</span>
                </p>
                <DatePicker
                  type={DatePickerType.TEXT_DATE}
                  period={depreciationStartDate}
                  setFilteredPeriod={setDepreciationStartDate}
                  btnClassName={isShowDepreciationStartDateHint ? inputStyle.ERROR : ''}
                  calenderClassName="right-0"
                />
              </div>
            ) : null}
            {/* Info: (20241015 - Julian) Useful Life (Month) */}
            {!isLandCost ? (
              <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
                <p className="font-semibold">
                  {t('asset:ADD_ASSET_MODAL.USEFUL_LIFE')}{' '}
                  <span className="text-text-state-error">*</span>
                </p>
                <div
                  className={`flex h-46px w-full items-center justify-between divide-x ${isShowUsefulLifeHint ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
                >
                  <NumericInput
                    id="input-useful-life"
                    name="input-useful-life"
                    value={inputUsefulLife}
                    setValue={setInputUsefulLife}
                    isDecimal
                    hasComma
                    required={!isLandCost}
                    className="flex-1 bg-transparent px-10px text-right outline-none"
                  />
                  <div className="flex w-60px items-center justify-center p-12px text-sm text-input-text-input-placeholder">
                    <p>{t('common:COMMON.MONTH')}</p>
                  </div>
                </div>
              </div>
            ) : null}
            {/* Info: (20241015 - Julian) Depreciation Method */}
            {!isLandCost ? (
              <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
                <p className="font-semibold">{t('asset:ADD_ASSET_MODAL.DEPRECIATION_METHOD')}</p>
                <div
                  onClick={toggleMethodMenu}
                  className="relative flex h-46px w-full items-center justify-between rounded-sm border border-input-stroke-input px-12px text-base font-medium text-input-text-input-filled hover:cursor-pointer"
                >
                  <p>{translateMethod(selectedDepreciationMethod)}</p>
                  <FaChevronDown />
                  <div
                    ref={methodRef}
                    className={`absolute left-0 top-50px grid w-full overflow-hidden ${
                      isMethodVisible ? 'grid-rows-1' : 'grid-rows-0'
                    } drop-shadow transition-all duration-150 ease-in-out`}
                  >
                    <div className="flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
                      {depreciationMethodMenu}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {/* Info: (20241015 - Julian) Note */}
            <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
              <p className="font-semibold">{t('asset:ADD_ASSET_MODAL.NOTE')}</p>
              <input
                id="input-note"
                type="text"
                placeholder={t('asset:ADD_ASSET_MODAL.NOTE_PLACEHOLDER')}
                value={inputNote}
                onChange={noteChangeHandler}
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
          </div>

          {/* Info: (20240503 - Julian) confirm buttons */}
          <div className="flex items-center justify-end gap-12px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={modalVisibilityHandler}
              variant="secondaryOutline"
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button className="px-16px py-8px" type="submit" variant="tertiary">
              <p>{t('common:COMMON.SAVE')}</p>
              <BiSave size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAssetModal;
