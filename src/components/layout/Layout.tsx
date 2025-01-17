import { Outlet } from 'react-router';

import { useProviderStore, ProviderSelect } from '@/features/provider';

const Layout: React.FC = () => {
  const { provider } = useProviderStore();

  return (
    <>
      <header className="max-w-screen-xl w-full h-[72px] px-2 py-2 xl:mx-auto xl:py-4 flex justify-between items-center">
        <img src="/logo.svg" alt="Positions" />
        <ProviderSelect />
      </header>
      <main className="max-w-screen-xl w-full h-full p-2 xl:mx-auto">
        <Outlet />
      </main>
      <footer className="max-w-screen-xl w-full p-2 xl:mx-auto xl:py-4 flex justify-between">
        <p className="text-xs">
          provider: <span className="font-semibold">{provider}</span>
        </p>
        <a
          className="text-xs underline cursor-pointer"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/lkaric/positions"
        >
          check it out on gh
        </a>
      </footer>
    </>
  );
};

export { Layout };
