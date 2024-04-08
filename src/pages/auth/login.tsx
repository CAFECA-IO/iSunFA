import React from 'react';
import NavBar from '../../components/nav_bar/nav_bar';
import LoginPageBody from '../../components/login_page_body/login_page_body';

const LoginPage = () => {
  return (
    <div className="h-screen bg-white">
      <div className="">
        <NavBar />
      </div>

      <LoginPageBody />
    </div>
  );
};

export default LoginPage;
