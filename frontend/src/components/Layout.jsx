import Navbar from './Navbar';

/**
 * Shell for protected dashboards: fixed left sidebar + scrollable main (#f0f4f8, 32px padding).
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="min-h-screen ml-[260px] bg-[#f0f4f8] p-8">{children}</main>
    </div>
  );
}
