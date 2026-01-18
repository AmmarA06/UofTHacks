import { Link, useLocation } from 'react-router-dom';
import { Database, Home, Box, Boxes, Tags, Activity, Store } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: Home },
        { path: '/objects', label: 'Objects', icon: Box },
        { path: '/classes', label: 'Classes', icon: Tags },
        { path: '/events', label: 'Events', icon: Activity },
        { path: '/spatial', label: 'Spatial', icon: Boxes },
        { path: '/store', label: 'Store', icon: Store },
    ];

    return (
        <nav className="h-20 border-b border-gray-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-50 w-full px-6 lg:px-12">
            <div className="max-w-7xl mx-auto h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Left - Logo */}
                    <Link to="/" className="flex items-center">
                        <img src="/new_logo.png" alt="Identify" className="h-14 w-auto" />
                    </Link>

                    {/* Center - Navigation */}
                    <div className="hidden md:flex items-center gap-1 bg-[#f3f3f3] rounded-full p-1 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={clsx(
                                        'flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all',
                                        isActive
                                            ? 'bg-white text-[#1a1a1a] shadow-sm'
                                            : 'text-gray-500 hover:text-[#1a1a1a]'
                                    )}
                                >
                                    <Icon size={14} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right - Back to Home */}
                    <Link to="/" className="text-[13px] text-gray-500 hover:text-[#1a1a1a] transition-colors">
                        Back to Home
                    </Link>
                </div>
            </div>
        </nav>
    );
}
