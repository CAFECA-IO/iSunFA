/* eslint-disable */
import React from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '../../interfaces/locale';
import { Button } from '../../components/button/button';
import { useUser } from '../../contexts/user_context';
import { cn } from '../../lib/utils/common';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '../../constants/config';
import NavBar from '../../components/nav_bar/nav_bar';
import LoginPageBody from '../../components/login_page_body/login_page_body';

const LoginPage = () => {
  const { user, signUp, signOut } = useUser();

  // const { t }: { t: TranslateFunction } = useTranslation('common');

  // const signUpClickHandler = async () => {
  //   try {
  //     signUp();
  //   } catch (error) {
  //     // Deprecated: dev (20240410 - Shirley)
  //     // eslint-disable-next-line no-console
  //     console.log('signUpClickHandler error:', error);
  //   }
  // };

  // const signOutClickHandler = async () => {
  //   try {
  //     signOut();
  //   } catch (error) {
  //     // Deprecated: dev (20240410 - Shirley)
  //     // eslint-disable-next-line no-console
  //     console.log('signOutClickHandler error:', error);
  //   }
  // };

  return (
    <div className="h-screen bg-white">
      {/* Info: nav bar */}
      <div className="">
        <NavBar />
      </div>

      <LoginPageBody />
    </div>
  );
};

export default LoginPage;
