import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';

const ExamplePage: React.FC = () => {
  return (
    <Layout isDashboard={false} pageTitle="Example Page" goBackUrl={ISUNFA_ROUTE.DASHBOARD}>
      <p>Example Page</p>
    </Layout>
  );
};

export default ExamplePage;
