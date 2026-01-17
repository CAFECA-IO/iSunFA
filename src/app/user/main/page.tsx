
import Header from '@/components/landing_page/header';
import Dashboard from '@/components/user/dashboard';

export default function UserMainPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <main className="flex-1 relative">
        <Dashboard />
      </main>
    </div>
  );
}
