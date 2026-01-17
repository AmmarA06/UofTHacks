import { Link, useLocation } from 'react-router-dom';
import { Database, Home, Box, Boxes, Tags } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Overview', icon: Home }, // Renamed Dashboard to Overview for that Vercel feel
        { path: '/objects', label: 'Objects', icon: Box },
        { path: '/classes', label: 'Classes', icon: Tags },
        { path: '/spatial', label: 'Spatial View', icon: Boxes }, // Renamed to Spatial View
    ];

    return (
        <nav className="h-16 border-b border-gray-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50 w-full transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo Section */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="bg-black text-white p-1 rounded-md">
                                <Database size={20} />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-black">VisualDB</span>
                        </Link>

                        {/* Navigation Links - Left Aligned next to logo like Vercel */}
                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={clsx(
                                            'text-sm font-medium transition-all duration-200 px-3 py-1.5 rounded-full',
                                            isActive
                                                ? 'text-gray-900 bg-gray-100/50 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side - User/Profile (Minimal) */}
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200"></div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
