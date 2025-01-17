import { Outlet } from 'react-router';

import { ProviderSelect } from '@/features/provider/components';

const Layout: React.FC = () => {
  return (
    <>
      <header className="max-w-screen-xl m-2 xl:mx-auto xl:my-4 h-[40px] flex justify-between items-center">
        <img src="/logo.svg" alt="Positions" />
        <ProviderSelect />
      </header>
      <main className="max-w-screen-xl m-2 xl:mx-auto">
        <Outlet />
      </main>
    </>
  );
};

export { Layout };
