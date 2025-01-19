import { Helmet } from 'react-helmet-async';

import { useWeb3Store } from '@/lib/web3';

const HomePage: React.FC = () => {
  const { error } = useWeb3Store();
  return (
    <>
      <Helmet>
        <title>Home - Positions</title>
      </Helmet>
      <h1>HomePage</h1>
      <pre>{JSON.stringify(error?.message)}</pre>
      <p>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Hic quae
        deserunt inventore veritatis sapiente vitae dolorum nesciunt quibusdam
        dolores beatae! Rerum omnis molestiae labore quos veritatis. At libero
        quaerat adipisci!
      </p>
    </>
  );
};

export { HomePage };
