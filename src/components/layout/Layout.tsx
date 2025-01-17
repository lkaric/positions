import { Outlet } from 'react-router';

const Layout: React.FC = () => {
  return (
    <>
      <header className="max-w-screen-xl m-2 xl:mx-auto xl:my-4 h-[40px]">
        <img src="/logo.svg" alt="Positions" />
      </header>
      <main className="max-w-screen-xl m-2 xl:mx-auto">
        <Outlet />
      </main>
    </>
  );
};

export { Layout };
