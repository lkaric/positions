import { Helmet } from 'react-helmet-async';

import { useProvider } from '@/features/provider';

const HomePage: React.FC = () => {
  useProvider();

  return (
    <>
      <Helmet>
        <title>Home - Positions</title>
      </Helmet>
      <h1>HomePage</h1>
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
