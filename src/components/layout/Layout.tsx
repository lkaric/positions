import { Outlet } from 'react-router';

const Layout: React.FC = () => {
  return (
    <>
      <header className="max-w-screen-xl m-2 xl:mx-auto xl:my-4">
        <img src="/logo.svg" />
      </header>
      <main className="max-w-screen-xl m-2 xl:mx-auto">
        <Outlet />
      </main>
    </>
  );
};

export { Layout };
