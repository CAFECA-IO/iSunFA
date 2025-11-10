// Deprecated: (20250507 - Liz) 即將棄用，先暫時保留做參照用
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoSaveOutline } from 'react-icons/io5';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import Image from 'next/image';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountBookDetails, IAccountBookWithTeam } from '@/interfaces/account_book';
import { countryList, CountriesMap } from '@/constants/normal_setting';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useModalContext } from '@/contexts/modal_context';
import Skeleton from '@/components/skeleton/skeleton';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';

interface IAccountBookInfoModalProps {
  accountBook: IAccountBookWithTeam;
  setIsAccountBookListModalOpen: Dispatch<SetStateAction<boolean>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
}

const AccountBookInfoModal = ({
  accountBook,
  setIsAccountBookListModalOpen,
  setRefreshKey,
}: IAccountBookInfoModalProps) => {
  const { t } = useTranslation(['settings', 'dashboard']);
  const { toastHandler } = useModalContext();
  const { deleteAccountBook } = useUserCtx();

  const [name, setName] = useState<IAccountBookDetails['name']>('');
  const [taxId, setTaxId] = useState<IAccountBookDetails['taxId']>('');
  const [taxSerialNumber, setTaxSerialNumber] =
    useState<IAccountBookDetails['taxSerialNumber']>('');
  const [representativeName, setRepresentativeName] =
    useState<IAccountBookDetails['representativeName']>('');
  const [address, setAddress] = useState<IAccountBookDetails['address']>('');

  const [countryCode, setCountryCode] = useState<IAccountBookDetails['country']['code']>();
  const [phoneNumber, setPhoneNumber] = useState<IAccountBookDetails['phoneNumber']>('');

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState<boolean>(false);
  const [isPhoneCountryDropdownOpen, setIsPhoneCountryDropdownOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [isGetAccountBookLoading, setIsGetAccountBookLoading] = useState<boolean>(false);
  const [isUpdateAccountBookLoading, setIsUpdateAccountBookLoading] = useState<boolean>(false);
  const [isDeleteAccountBookLoading, setIsDeleteAccountBookLoading] = useState<boolean>(false);

  // Info: (20250411 - Liz) 取得帳本詳細資訊 API
  const { trigger: getAccountBookInfoByIdAPI } = APIHandler<IAccountBookDetails>(
    APIName.GET_ACCOUNT_BOOK_INFO_BY_ID
  );

  // Info: (20250415 - Liz) 更新帳本資訊 API
  const { trigger: updateAccountBookInfoAPI } = APIHandler<IAccountBookDetails>(
    APIName.UPDATE_ACCOUNT_BOOK_INFO
  );

  // Info: (20250416 - Liz) 刪除帳本 API
  // const { trigger: deleteAccountBookAPI } = APIHandler<IAccountBook>(APIName.DELETE_ACCOUNT_BOOK);

  const closeAccountBookInfoModal = () => {
    setIsAccountBookListModalOpen(false);
  };
  const toggleCountryDropdown = () => {
    setIsCountryDropdownOpen((prev) => !prev);
    // Info: (20250415 - Liz) 關閉其他下拉選單
    setIsPhoneCountryDropdownOpen(false);
  };
  const togglePhoneCountryDropdown = () => {
    setIsPhoneCountryDropdownOpen((prev) => !prev);
    // Info: (20250415 - Liz) 關閉其他下拉選單
    setIsCountryDropdownOpen(false);
  };

  // Info: (20250415 - Liz) 打 API 更新帳本資訊
  const handleSubmit = async () => {
    // Info: (20250415 - Liz) 防止重複點擊
    if (isUpdateAccountBookLoading) return;

    // Info: (20250415 - Liz) 開始 API 請求時設為 loading 狀態
    setIsUpdateAccountBookLoading(true);

    try {
      const success = await updateAccountBookInfoAPI({
        params: {
          accountBookId: accountBook.id,
        },
        body: {
          name,
          taxId,
          taxSerialNumber,
          representativeName,
          country: countryCode,
          phoneNumber,
          address,
        },
      });

      if (!success) {
        toastHandler({
          id: ToastId.ACCOUNT_BOOK_INFO_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNT_BOOK_INFO.UPDATE_ACCOUNT_BOOK_FAIL'),
          closeable: true,
          autoClose: 2000,
        });
        return;
      }

      toastHandler({
        id: ToastId.ACCOUNT_BOOK_INFO_UPDATE_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('settings:ACCOUNT_BOOK_INFO.UPDATE_ACCOUNT_BOOK_SUCCESS'),
        closeable: true,
        autoClose: 2000,
      });

      closeAccountBookInfoModal(); // Info: (20250415 - Liz) 關閉 modal
      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250415 - Liz) 重新整理帳本清單
    } catch (error) {
      (error as Error).message += ' (from handleSubmit)';
      toastHandler({
        id: ToastId.ACCOUNT_BOOK_INFO_UPDATE_ERROR,
        type: ToastType.ERROR,
        content: t('settings:ACCOUNT_BOOK_INFO.UPDATE_ACCOUNT_BOOK_FAIL'),
        closeable: true,
        autoClose: 2000,
      });
    } finally {
      setIsUpdateAccountBookLoading(false);
    }
  };

  // Info: (20250416 - Liz) 打 API 刪除帳本
  const handleDelete = async () => {
    // Info: (20250416 - Liz) 防止重複點擊
    if (isDeleteAccountBookLoading) return;

    // Info: (20250416 - Liz) 開始 API 請求時設為 loading 狀態
    setIsDeleteAccountBookLoading(true);
    try {
      const success = await deleteAccountBook(accountBook.id);
      if (!success) {
        toastHandler({
          id: ToastId.ACCOUNT_BOOK_DELETE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK_FAIL'),
          closeable: true,
          autoClose: 2000,
        });
        return;
      }

      toastHandler({
        id: ToastId.ACCOUNT_BOOK_DELETE_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK_SUCCESS'),
        closeable: true,
        autoClose: 2000,
      });
      closeAccountBookInfoModal(); // Info: (20250416 - Liz) 關閉 modal
      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250416 - Liz) 重新整理帳本清單
    } catch (error) {
      (error as Error).message += ' (from handleDelete)';
      toastHandler({
        id: ToastId.ACCOUNT_BOOK_DELETE_ERROR,
        type: ToastType.ERROR,
        content: t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK_FAIL'),
        closeable: true,
        autoClose: 2000,
      });
    } finally {
      setIsDeleteAccountBookLoading(false);
    }
  };

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const messageModalData: IMessageModal = {
    title: t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK'),
    content: t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK_CONFIRM'),
    submitBtnStr: t('settings:ACCOUNT_BOOK_INFO.REMOVE'),
    submitBtnFunction: handleDelete,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('settings:ACCOUNT_BOOK_INFO.CANCEL'),
  };

  // Info: (20250415 - Liz) 打 API 取得帳本詳細資訊 (getAccountBookInfoByBookId)
  useEffect(() => {
    if (!accountBook) return;

    const getAccountBookInfo = async () => {
      setIsGetAccountBookLoading(true);
      try {
        const { success, data } = await getAccountBookInfoByIdAPI({
          params: { accountBookId: accountBook.id },
        });

        if (success && data) {
          setName(data.name);
          setTaxId(data.taxId);
          setTaxSerialNumber(data.taxSerialNumber);
          setRepresentativeName(data.representativeName);
          setAddress(data.address);
          setCountryCode(data.country.code);
          setPhoneNumber(data.phoneNumber);
        }
      } catch (error) {
        (error as Error).message += ' (from getAccountBookInfo)';
        toastHandler({
          id: ToastId.ACCOUNT_BOOK_INFO_GET_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNT_BOOK_INFO.GET_ACCOUNT_BOOK_FAIL'),
          closeable: true,
        });
      } finally {
        setIsGetAccountBookLoading(false);
      }
    };

    getAccountBookInfo();
  }, [accountBook, toastHandler]);

  // Info: (20250415 - Liz) 如果打 API 還在載入中，顯示 loading 樣式
  if (isGetAccountBookLoading) {
    return (
      <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
        <div className="overflow-hidden rounded-md bg-surface-neutral-surface-lv1">
          <header className="flex items-center justify-between px-40px pb-24px pt-40px">
            <h1 className="grow text-center text-xl font-bold leading-8 text-text-neutral-secondary">
              {accountBook.name}
            </h1>
            <button type="button" onClick={closeAccountBookInfoModal}>
              <IoCloseOutline size={24} />
            </button>
          </header>

          <div className="mb-40px flex w-600px flex-col items-center gap-16px">
            <Skeleton width={500} height={30} />
            <Skeleton width={500} height={30} />
            <Skeleton width={500} height={30} />
            <Skeleton width={500} height={30} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md bg-surface-neutral-surface-lv1">
        <header className="flex items-center justify-between px-40px pb-24px pt-40px">
          <h1 className="grow text-center text-xl font-bold leading-8 text-text-neutral-secondary">
            {accountBook.name}
          </h1>
          <button type="button" onClick={closeAccountBookInfoModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="flex max-h-65vh flex-col gap-40px overflow-y-auto px-40px pb-40px">
          {/* Info: (20250415 - Liz) Divider */}
          <section className="flex items-center gap-lv-4">
            <div className="flex items-center gap-lv-2">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="company_icon"
              />
              <span className="text-sm font-medium text-divider-text-lv-1">
                {t('settings:ACCOUNT_BOOK_INFO.ACCOUNT_BOOK_INFORMATION')}
              </span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-4"></div>
          </section>

          <section className="flex items-start gap-40px">
            {/* Info: (20250415 - Liz) 公司名稱 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.COMPANY_NAME')}
              </h4>
              <input
                type="text"
                placeholder={t('settings:ACCOUNT_BOOK_INFO.ENTER_NAME')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Info: (20250415 - Liz) 統一編號 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.BUSINESS_TAX_ID_NUMBER')}
              </h4>
              <input
                type="text"
                placeholder={t('settings:ACCOUNT_BOOK_INFO.ENTER_NUMBER')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>

            {/* Info: (20250415 - Liz) 稅籍編號 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.TAX_SERIAL_NUMBER')}
              </h4>
              <input
                type="text"
                placeholder={t('settings:ACCOUNT_BOOK_INFO.ENTER_NUMBER')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                value={taxSerialNumber}
                onChange={(e) => setTaxSerialNumber(e.target.value)}
              />
            </div>
          </section>

          <section className="flex items-start gap-40px">
            {/* Info: (20250415 - Liz) 負責人 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.COMPANY_REPRESENTATIVE_NAME')}
              </h4>
              <input
                type="text"
                placeholder={t('settings:ACCOUNT_BOOK_INFO.ENTER_REPRESENTATIVE_NAME')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
              />
            </div>

            {/* Info: (20250415 - Liz) 註冊國家 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.COUNTRY_OF_INCORPORATION')}
              </h4>

              <section className="relative">
                <button
                  type="button"
                  className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                  onClick={toggleCountryDropdown}
                >
                  <div className="px-12px py-10px">
                    <Image
                      src={CountriesMap[countryCode || 'tw'].icon}
                      width={16}
                      height={16}
                      alt="country_icon"
                    />
                  </div>

                  <p className="flex-auto px-12px py-10px text-start text-base font-medium">
                    {countryCode ? (
                      CountriesMap[countryCode].name
                    ) : (
                      <span className="text-input-text-input-placeholder">
                        {t('settings:ACCOUNT_BOOK_INFO.SELECT_COUNTRY')}
                      </span>
                    )}
                  </p>

                  <div className="px-12px py-10px">
                    {isCountryDropdownOpen ? (
                      <IoChevronUp size={20} />
                    ) : (
                      <IoChevronDown size={20} />
                    )}
                  </div>
                </button>

                {isCountryDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                      {countryList &&
                        countryList.length > 0 &&
                        countryList.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCountryCode(item.id);
                              toggleCountryDropdown();
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {item.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Info: (20250415 - Liz) 電話號碼 */}
            <div className="flex w-225px flex-col gap-8px">
              <h4 className="text-sm font-semibold text-input-text-primary">
                {t('settings:ACCOUNT_BOOK_INFO.PHONE_NUMBER')}
              </h4>

              <section className="flex items-stretch bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM">
                <div className="relative flex flex-none rounded-l-sm border-y border-l border-input-stroke-input">
                  <button
                    type="button"
                    className="flex items-center gap-8px px-12px py-10px"
                    onClick={togglePhoneCountryDropdown}
                  >
                    <Image
                      src={CountriesMap[countryCode || 'tw'].icon}
                      width={16}
                      height={16}
                      alt="country_icon"
                    />

                    {isCountryDropdownOpen ? (
                      <IoChevronUp size={20} />
                    ) : (
                      <IoChevronDown size={20} />
                    )}
                  </button>

                  {isPhoneCountryDropdownOpen && (
                    <div className="absolute inset-x-0 top-full z-10 mt-8px">
                      <div className="mb-20px flex w-fit flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                        {countryList &&
                          countryList.length > 0 &&
                          countryList.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setCountryCode(item.id);
                                togglePhoneCountryDropdown();
                              }}
                              className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                            >
                              <Image src={item.icon} width={16} height={16} alt="country_icon" />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder={t('settings:ACCOUNT_BOOK_INFO.ENTER_NUMBER')}
                  className="w-full rounded-r-sm border-y border-r border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium outline-none"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </section>
            </div>
          </section>

          {/* Info: (20250415 - Liz) 地址 */}
          <section className="flex flex-col gap-8px">
            <h4 className="text-sm font-semibold text-input-text-primary">
              {t('settings:ACCOUNT_BOOK_INFO.COMPANY_ADDRESS')}
            </h4>
            <input
              type="text"
              placeholder={t('settings:ACCOUNT_BOOK_INFO.PLEASE_ENTER_THE_FULL_ADDRESS')}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </section>

          {/* Info: (20250415 - Liz) 刪除帳本 */}
          <section>
            <button
              type="button"
              className="flex items-center gap-8px text-sm font-semibold text-text-state-error"
              onClick={openDeleteModal}
            >
              <FiTrash2 size={16} />
              <span>{t('settings:ACCOUNT_BOOK_INFO.REMOVE_ACCOUNT_BOOK')}</span>
            </button>
          </section>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeAccountBookInfoModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              <p>{t('settings:ACCOUNT_BOOK_INFO.CANCEL')}</p>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isUpdateAccountBookLoading}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <p>{t('settings:ACCOUNT_BOOK_INFO.SAVE')}</p>
              <IoSaveOutline size={16} />
            </button>
          </section>
        </div>
      </div>

      {/* Info: (20250416 - Liz) Modal */}
      {isDeleteModalOpen && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={isDeleteModalOpen}
          modalVisibilityHandler={closeDeleteModal}
        />
      )}
    </main>
  );
};

export default AccountBookInfoModal;
