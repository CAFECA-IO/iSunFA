import React from 'react';

const CustomPage: React.FC = () => {
  return (
    <div>
      <h1>這是一個自訂頁面</h1>
      <p>此頁面不需要經過 /users 路由。</p>
    </div>
  );
};

export default CustomPage;
