import { Helmet } from 'react-helmet-async';

import { CdpList } from '@/features/cdp';

const HomePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Home - Positions</title>
      </Helmet>
      <CdpList />
    </>
  );
};

export { HomePage };
