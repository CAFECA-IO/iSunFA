import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';

const ExamplePage: React.FC = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn(); // 若未驗證則導向登入頁面
    }
  }, [status]);

  if (status === 'loading') {
    return <p>載入中...</p>;
  }

  if (status === 'authenticated') {
    return (
      <div>
        <h1>Example Page</h1>
        <p>This is an example page. Let me know if you need help with anything.</p>
        <p>
          You are logged in as <strong>{session?.user?.email}</strong>.
        </p>
      </div>
    );
  }

  return null;
};

export default ExamplePage;
