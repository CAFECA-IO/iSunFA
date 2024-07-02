/* eslint-disable */
import React from 'react';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';

interface IViewAnalysisSectionProps {
  reportTypesName: { id: string; name: string };
  tokenContract: string;
  tokenId: string;
  reportLink: string;
}

const ViewAnalysisSection = ({
  reportTypesName,
  tokenContract,
  tokenId,
  reportLink,
}: IViewAnalysisSectionProps) => {
  const { t } = useTranslation('common');
  const copyTokenContract = () => {
    navigator.clipboard.writeText(tokenContract);
    window.alert(`Token contract ${tokenContract} copied to clipboard!`);
  };

  const copyTokenId = () => {
    navigator.clipboard.writeText(tokenId);
    window.alert(`Token ID ${tokenId} copied to clipboard!`);
  };

  const copyTokenContractClickHandler = () => {
    copyTokenContract();
  };

  const copyTokenIdClickHandler = () => {
    copyTokenId();
  };

  const backClickHandler = () => {
    window.history.back();
  };

  // TODO: no `map` and `conditional rendering` in return (20240502 - Shirley)
  return (
    <div className="flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0 pt-32">
      {/* Info: financial title, print button and share button (20240426 - Shirley) */}
      <div className="mx-10 flex items-center gap-5 border-b border-lightGray px-px pb-6 max-md:flex-wrap lg:mx-40">
        <Button
          onClick={backClickHandler}
          variant={'tertiaryOutline'}
          className="my-auto flex flex-col justify-center self-stretch rounded-xs p-2.5"
        >
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fill="none"
                fillRule="evenodd"
                d="M8.532 2.804a.75.75 0 010 1.06L5.146 7.251h7.523a.75.75 0 010 1.5H5.146l3.386 3.386a.75.75 0 11-1.06 1.06L2.805 8.532a.75.75 0 010-1.06l4.667-4.667a.75.75 0 011.06 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </Button>
        <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-slate-500 max-md:max-w-full lg:text-4xl">
          {reportTypesName.name}
        </div>
        <div className="my-auto flex flex-col justify-center self-stretch">
          <div className="flex gap-3">
            <Button
              // TODO: yet to dev (20240507 - Shirley)
              disabled={true}
              variant={'tertiary'}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-xs p-2.5"
            >
              <div className="flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#FCFDFF"
                    fillRule="evenodd"
                    d="M8.002 1.251a.75.75 0 01.75.75v6.19l2.053-2.054a.75.75 0 011.06 1.061l-3.332 3.333a.75.75 0 01-1.061 0L4.139 7.198a.75.75 0 011.06-1.06L7.252 8.19V2.001a.75.75 0 01.75-.75zm-6 8a.75.75 0 01.75.75v.8c0 .572 0 .957.025 1.252.023.288.065.425.111.515.12.236.312.427.547.547.09.046.228.088.515.111.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.111a1.25 1.25 0 00.546-.546c.046-.091.088-.228.111-.516.025-.295.025-.68.025-1.252v-.8a.75.75 0 111.5 0V10.831c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 01-1.201 1.202c-.338.172-.694.24-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.03-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.073-.03-.365-.03-.81-.03-1.345V10.001a.75.75 0 01.75-.75z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </Button>
            <Button
              // TODO: yet to dev (20240507 - Shirley)
              disabled={true}
              variant={'tertiary'}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-xs p-2.5"
            >
              <div className="flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#FCFDFF"
                    fillRule="evenodd"
                    d="M6.83 2.042c.21-.26.53-.407.866-.4.297.008.52.157.625.232a5.563 5.563 0 01.383.312l5.647 4.84.014.013c.069.059.152.13.22.2.078.078.19.208.258.396.085.237.085.496 0 .732-.068.189-.18.318-.258.397-.068.07-.151.14-.22.2l-.014.012-5.647 4.84-.02.017c-.122.105-.25.215-.363.295a1.128 1.128 0 01-.625.231 1.083 1.083 0 01-.867-.398 1.129 1.129 0 01-.231-.625 5.557 5.557 0 01-.012-.469V10.898a6.848 6.848 0 00-4.007 2.357.75.75 0 01-1.327-.479v-.408a7.194 7.194 0 015.334-6.945V3.16v-.026c0-.162 0-.33.012-.468.012-.13.043-.395.231-.625zm1.256 1.59v2.392a.75.75 0 01-.621.739 5.694 5.694 0 00-4.51 4.103A8.353 8.353 0 017.285 9.3a.75.75 0 01.8.748v2.322l5.098-4.369-5.097-4.37z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Info: token contract and token id info (20240426 - Shirley) */}
      <div className="mx-10 mt-5 flex items-center gap-5 px-px text-sm max-md:flex-wrap lg:mx-40">
        <div className="hidden w-full flex-col justify-start gap-4 lg:flex lg:flex-row lg:space-x-2">
          <div className="flex space-x-5">
            <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_CONTRACT')} </div>
            <div className="flex items-center space-x-3">
              {/* TODO: link (20240507 - Shirley) */}
              {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenContract}{' '}
              </Link> */}
              <div className="font-semibold text-link-text-primary">{tokenContract} </div>

              <button onClick={copyTokenContractClickHandler} type="button">
                {' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="flex space-x-5">
            <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_ID')}</div>

            <div className="flex items-center space-x-3">
              {/* TODO: link (20240507 - Shirley) */}
              {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenId}
              </Link> */}

              <div className="font-semibold text-link-text-primary">{tokenId} </div>

              <button onClick={copyTokenIdClickHandler} type="button">
                {' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-0 flex flex-col lg:hidden">
          <div className="flex flex-col pr-2">
            <div className="flex gap-0">
              <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                {t('JOURNAL.TOKEN_CONTRACT')}
              </div>
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center">
                  <button onClick={copyTokenContractClickHandler} type="button">
                    {' '}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#001840"
                        fillRule="evenodd"
                        d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* TODO: link (20240507 - Shirley) */}

            <div className="flex flex-col justify-center whitespace-nowrap text-xs font-semibold leading-5 tracking-normal text-link-text-primary">
              <div className="justify-center rounded-md">{tokenContract}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex gap-0">
              <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                {t('JOURNAL.Token ID')}
              </div>
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center">
                  <button onClick={copyTokenIdClickHandler} type="button">
                    {' '}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#001840"
                        fillRule="evenodd"
                        d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* TODO: link (20240507 - Shirley) */}

            <div className="flex flex-col justify-center whitespace-nowrap text-sm font-semibold leading-5 tracking-normal text-link-text-primary">
              <div className="justify-center rounded-md">{tokenId}</div>
            </div>
          </div>
        </div>

        <div className=""></div>
      </div>
    </div>
  );
};

export default ViewAnalysisSection;
