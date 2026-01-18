import { Navbar } from './Navbar';

export function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
