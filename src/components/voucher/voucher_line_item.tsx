import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { LuTrash2 } from 'react-icons/lu';
// import { numberWithCommas } from '@/lib/utils/common';
import { ILineItemUI, IReverseItemUI } from '@/interfaces/line_item';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { FaPlus } from 'react-icons/fa6';
import ReverseLineItem from '@/components/voucher/reverse_line_item';
import { IAccount } from '@/interfaces/accounting_account';
import AccountTitleSelector from '@/components/ledger/account_title_selector';
import NumericInput from '@/components/numeric_input/numeric_input';

interface IVoucherLineItemProps {
  id: number;
  data: ILineItemUI; // Info: (20241121 - Julian) 單筆 LineItem 資料
  setLineItems: React.Dispatch<React.SetStateAction<ILineItemUI[]>>; // Info: (20241121 - Julian) 更新 LineItem
  flagOfClear: boolean;
  flagOfSubmit: boolean;
  accountIsNull: boolean;
  amountNotEqual: boolean;
  amountIsZero: boolean;
  isShowReverseHint: boolean; // Info: (20250304 - Julian) 是否顯示反轉分錄提示
}

const VoucherLineItem: React.FC<IVoucherLineItemProps> = ({
  id,
  data,
  setLineItems,
  flagOfClear,
  flagOfSubmit,
  accountIsNull,
  amountNotEqual,
  amountIsZero,
  isShowReverseHint,
}) => {
  const { t } = useTranslation('common');
  const { reverseList: commonReverseList, addReverseListHandler } = useAccountingCtx();
  const { selectReverseItemsModalVisibilityHandler, selectReverseDataHandler } = useGlobalCtx();

  const {
    id: lineItemId,
    account: lineItemAccount,
    description: lineItemDescription,
    debit: lineItemDebit,
    amount: lineItemAmount,
    reverseList: lineItemReverseList,
  } = data;

  // Info: (20241121 - Julian) 判斷借貸金額
  const lineItemAmountNum = parseFloat(lineItemAmount) || 0;
  const lineItemDebitAmount = lineItemDebit === true ? lineItemAmountNum : 0;
  const lineItemCreditAmount = lineItemDebit === false ? lineItemAmountNum : 0;

  // Info: (20241210 - Anna) 判斷是否顯示沖銷項目
  const defaultCondition = (amount: number) => amount > 0; // Info: (20241210 - Anna) 默認條件

  const shouldShowReverseButton = (code: string, amount: number) => ({
    regex: new RegExp(`^${code}(-\\d+)?$`), // Info: (20250212 - Anna) 匹配 'code' 或 'code-數字'
    amount,
    condition: defaultCondition,
  });

  // Info: (20241210 - Anna) 基於 lineItemDebitAmount 的會計科目 (應付、預收、租賃負債、合約負債、借款)
  const debitConditions = [
    '2102',
    '2108',
    '2131',
    '2132',
    '2133',
    '2139',
    '2151',
    '2152',
    '2161',
    '2162',
    '2171',
    '2172',
    '2181',
    '2182',
    '2190',
    '2195',
    '2202',
    '2203',
    '2204',
    '2209',
    '2211',
    '2212',
    '2213',
    '2215',
    '2219',
    '2220',
    '2281',
    '2282',
    '2313',
    '2315',
    '2322',
    '2323',
    '2324',
    '2330',
    '2335',
    '2350',
    '2355',
    '2365',
    '2370',
    '2527',
    '2541',
    '2542',
    '2543',
    '2581',
    '2582',
    '2611',
    '2612',
    '2613',
    '2614',
    '2621',
    '2622',
    '2623',
    '2624',
    '2630',
    '2645',
    '2675',
    '2680',
  ].map((code) => shouldShowReverseButton(code, lineItemDebitAmount));

  // Info: (20241210 - Anna) 基於 lineItemCreditAmount 的會計科目 (應收、預付、合約資產)
  const creditConditions = [
    '1141',
    '1151',
    '1152',
    '1161',
    '1162',
    '1172',
    '1173',
    '1175',
    '1181',
    '1182',
    '1184',
    '1190',
    '1195',
    '119A',
    '119C',
    '119F',
    '119H',
    '1201',
    '1202',
    '1203',
    '1204',
    '1205',
    '1206',
    '1211',
    '1212',
    '1221',
    '1222',
    '1325',
    '1412',
    '1414',
    '1419',
    '1421',
    '1422',
    '1429',
    '1471',
    '1472',
    '1475',
    '1478',
    '1561',
    '1915',
    '1920',
    '1931',
    '1932',
    '1933',
    '1935',
    '1941',
    '1942',
    '1943',
    '1945',
    '1947',
    '194B',
    '194E',
    '194I',
    '194L',
    '1985',
  ].map((code) => shouldShowReverseButton(code, lineItemCreditAmount));

  // Info: (20241210 - Anna) 合併條件
  const reverseConditions = [...creditConditions, ...debitConditions];

  // Info: (20241210 - Anna) 檢查條件
  const isShowReverse = reverseConditions.some(
    ({ regex, amount, condition }) => regex.test(lineItemAccount?.code || '') && condition(amount)
  );

  const inputStyle = {
    NORMAL:
      'border-input-stroke-input text-input-text-input-filled placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder',
    ERROR:
      'border-input-text-error text-input-text-error placeholder:text-input-text-error disabled:text-input-text-error',
  };

  // Info: (20241007 - Julian) input state
  const [particulars, setParticulars] = useState<string>('');
  const [debitInput, setDebitInput] = useState<number>(0);
  const [creditInput, setCreditInput] = useState<number>(0);

  // Info: (20241007 - Julian) input style
  const [amountStyle, setAmountStyle] = useState<string>(inputStyle.NORMAL);

  // Info: (20241121 - Julian) ReverseList state
  const [reverseListUI, setReverseListUI] = useState<IReverseItemUI[]>([]);

  // Info: (20241118 - Julian) 設定預設值
  useEffect(() => {
    const defaultDebit = lineItemDebitAmount;
    const defaultCredit = lineItemCreditAmount;

    setParticulars(lineItemDescription);
    setDebitInput(defaultDebit);
    setCreditInput(defaultCredit);
  }, [data]);

  useEffect(() => {
    // Info: (20241220 - Julian) 更新 isReverse 狀態
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], isReverse: isShowReverse };
      }
      return duplicateList;
    });
  }, [isShowReverse]);

  // Info: (20241121 - Julian) 把預設的反轉分錄列表丟進 reverseList 裡，讓使用者可以編輯
  useEffect(() => {
    if (lineItemReverseList.length > 0) {
      const defaultReverseList: IReverseItemUI[] = data.reverseList.map((reverseItem) => {
        const reverseItemUI: IReverseItemUI = {
          ...reverseItem,
          lineItemIndex: data.id,
          isSelected: false,
          reverseAmount: reverseItem.amount,
        };
        return reverseItemUI;
      });

      setReverseListUI(defaultReverseList);

      defaultReverseList.forEach((item) => {
        addReverseListHandler(item.lineItemIndex, [item]);
      });
    }
  }, []);

  // Info: (20241121 - Julian) 共用的反轉分錄列表變動時，更新 UI
  useEffect(() => {
    const newReverseList: IReverseItemUI[] = commonReverseList[data.id] || [];
    setReverseListUI(newReverseList);
    // Info: (20241121 - Julian) 更新反轉分錄列表
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], reverseList: newReverseList };
      }
      return duplicateList;
    });
  }, [commonReverseList]);

  useEffect(() => {
    // Info: (20241004 - Julian) Reset All State
    setParticulars('');
    setDebitInput(0);
    setCreditInput(0);
  }, [flagOfClear]);

  useEffect(() => {
    setAmountStyle(
      // Info: (20241007 - Julian) 檢查借貸金額是否為零
      (amountIsZero && (debitInput === 0 || creditInput === 0)) ||
        // Info: (20241007 - Julian) 檢查借貸金額是否相等
        amountNotEqual
        ? inputStyle.ERROR
        : inputStyle.NORMAL
    );
  }, [flagOfSubmit]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改借貸金額時，樣式改回 NORMAL
    setAmountStyle(inputStyle.NORMAL);
  }, [debitInput, creditInput]);

  // Info: (20241118 - Julian) 若借方金額不為 0，則禁用貸方金額輸入；反之亦然
  const isDebitDisabled = creditInput !== 0;
  const isCreditDisabled = debitInput !== 0;

  const particularsInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticulars(e.target.value);
    // Info: (20241121 - Julian) 設定 Particulars
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], description: e.target.value };
      }
      return duplicateList;
    });
  };

  const debitInputChangeHandler = (value: number) => {
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭
    const debitValue = value;

    // Info: (20241105 - Julian) 加入千分位逗號會造成輸入錯誤，暫時移除
    // setDebitInput(numberWithCommas(debitValue));
    setDebitInput(debitValue);
    // Info: (20241001 - Julian) 設定 Debit
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], amount: debitValue.toString(), debit: true };
      }
      return duplicateList;
    });
  };

  const creditInputChangeHandler = (value: number) => {
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭 0
    // const creditNum = parseInt(e.target.value, 10);
    // const creditValue = Number.isNaN(creditNum) ? 0 : creditNum;
    const creditValue = value;

    // Info: (20241105 - Julian) 加入千分位逗號會造成輸入錯誤，暫時移除
    // setCreditInput(numberWithCommas(creditValue));
    setCreditInput(creditValue);
    // Info: (20241001 - Julian) 設定 Credit
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], amount: creditValue.toString(), debit: false };
      }
      return duplicateList;
    });
  };

  // Info: (20241120 - Julian) 新增反轉分錄
  const addReverseHandler = () => {
    const modalData = {
      account: lineItemAccount, // Info: (20241105 - Julian) 會計科目編號
      lineItemIndex: lineItemId, // Info: (20241105 - Julian) LineItem ID
    };

    selectReverseDataHandler(modalData);
    selectReverseItemsModalVisibilityHandler();
  };

  const deleteLineHandler = () => {
    setLineItems((prev) => prev.filter((item) => item.id !== data.id));
  };

  // Info: (20250305 - Julian) 選擇會計科目
  const accountSelectedHandler = (account: IAccount) => {
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], account };
      }
      return duplicateList;
    });
  };

  const displayedAddItem = isShowReverseHint ? (
    // Info: (20250304 - Julian) 紅字
    <button
      id="add-reverse-item-button"
      type="button"
      className="group flex items-center gap-4px text-sm text-text-state-error-invert hover:text-text-state-error"
      onClick={addReverseHandler}
    >
      <div className="p-8px">
        <FaPlus size={16} />
      </div>
      <p>
        {t('journal:VOUCHER_LINE_BLOCK.REVERSE_ITEM')}
        <span>*</span>
      </p>

      <p className="ml-10px">{t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}</p>
    </button>
  ) : (
    <button
      id="add-reverse-item-button"
      type="button"
      className="group flex items-center gap-4px text-sm text-text-neutral-solid-light"
      onClick={addReverseHandler}
    >
      <div className="p-8px text-button-text-primary group-hover:text-button-text-primary-hover">
        <FaPlus size={16} />
      </div>
      <p>
        {t('journal:VOUCHER_LINE_BLOCK.REVERSE_ITEM')}
        <span className="text-text-state-error-invert">*</span>
      </p>
    </button>
  );

  return (
    <>
      {/* Info: (20241121 - Julian) Line Item */}
      <>
        {/* Info: (20241125 - Julian) Accounting */}
        <AccountTitleSelector
          id={id}
          defaultAccount={lineItemAccount}
          accountSelectedHandler={accountSelectedHandler}
          accountIsNull={accountIsNull}
          flagOfSubmit={flagOfSubmit}
          className="col-span-3 mt-lv-5"
        />
        {/* Info: (20240927 - Julian) Particulars */}
        <input
          id={`particulars-input-${id}`}
          type="string"
          value={particulars}
          onChange={particularsInputChangeHandler}
          className="col-span-3 mt-lv-5 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-input-text-input-filled"
        />
        {/* Info: (20240927 - Julian) Debit */}
        <NumericInput
          id="input-debit"
          name="input-debit"
          value={debitInput}
          isDecimal
          required
          hasComma
          className={`${amountStyle} col-span-3 mt-lv-5 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right disabled:bg-input-surface-input-disable`}
          triggerWhenChanged={debitInputChangeHandler}
          disabled={isDebitDisabled}
        />
        {/* Info: (20240927 - Julian) Credit */}
        <NumericInput
          id="input-credit"
          name="input-credit"
          value={creditInput}
          isDecimal
          required
          hasComma
          className={`${amountStyle} col-span-3 mt-lv-5 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right disabled:bg-input-surface-input-disable`}
          triggerWhenChanged={creditInputChangeHandler}
          disabled={isCreditDisabled}
        />
        {/* Info: (20240927 - Julian) Delete button */}
        <div
          id={`delete-line-item-btn-${id}`}
          className="mt-lv-5 text-center text-stroke-neutral-invert hover:text-button-text-primary-hover"
        >
          <button type="button" className="p-12px" onClick={deleteLineHandler}>
            <LuTrash2 size={22} />
          </button>
        </div>
      </>

      {/* Info: (20241104 - Julian) 反轉分錄列表 */}
      {commonReverseList && reverseListUI.length > 0
        ? reverseListUI.map((item) => {
            const removeReverse = () =>
              addReverseListHandler(
                data.id,
                reverseListUI.filter((reverseItem) => reverseItem.voucherId !== item.voucherId)
              );
            return (
              <ReverseLineItem
                key={`${item.voucherId}-${id}`}
                reverseItem={item}
                addHandler={addReverseHandler}
                removeHandler={removeReverse}
              />
            );
          })
        : null}

      {/* Info: (20241104 - Julian) 如果需要反轉分錄，則顯示新增按鈕 */}
      {isShowReverse ? (
        <div key={`add-reverse-item-${id}`} className="col-start-1 col-end-13">
          {displayedAddItem}
        </div>
      ) : null}
    </>
  );
};

export default VoucherLineItem;
