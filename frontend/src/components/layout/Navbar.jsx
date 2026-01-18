import { Link, useLocation } from 'react-router-dom';
import { Database, Home, Box, Boxes, Tags, Activity, Store } from 'lucide-react';
import { clsx } from 'clsx';

// Identify logo - matches landing page
const IdentifyLogo = ({ className = "" }) => (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <circle cx="16" cy="16" r="2" fill="white" />
    </svg>
);

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
        <nav className="h-20 border-b border-gray-200 bg-white sticky top-0 z-50 w-full px-6 lg:px-12 shadow-sm">
            <div className="max-w-7xl mx-auto h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Left - Logo & Title */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <span className="text-[26px] font-bold text-[#1a1a1a] tracking-tight relative">
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                D
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                i
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                s
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                c
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                o
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                v
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                e
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                r
                            </span>
                            <span className="inline-block transition-all duration-300 group-hover:tracking-wide">
                                y
                            </span>
                        </span>
                    </Link>

                    {/* Center - Navigation */}
                    <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-full p-1 absolute left-1/2 -translate-x-1/2">
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
                                            ? 'bg-[#1a1a1a] text-white shadow-sm'
                                            : 'text-gray-600 hover:text-[#1a1a1a] hover:bg-white'
                                    )}
                                >
                                    <Icon size={14} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right - Empty space for balance */}
                    <div className="w-24"></div>
                </div>
            </div>
        </nav>
    );
}
