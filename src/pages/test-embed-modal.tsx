import React, { useState } from 'react';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal_new';
import { Button } from '@/components/button/button';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';

const TestEmbedModalPage = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const toggleModalVisibility = () => {
    setIsModalVisible(!isModalVisible);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Embed Code Modal Test Page</h1>
      <Button type="button" onClick={toggleModalVisibility} variant="tertiary">
        Open Embed Code Modal
      </Button>

      <EmbedCodeModal
        isModalVisible={isModalVisible}
        modalVisibilityHandler={toggleModalVisibility}
      />
    </div>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'report_401'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default TestEmbedModalPage;
