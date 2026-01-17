import { Link, useLocation } from 'react-router-dom';
import { Home, Box, Boxes, Tags, Activity } from 'lucide-react';
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
    ];

    return (
        <nav className="h-14 border-b border-gray-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-50 w-full">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo Section */}
                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center">
                            <IdentifyLogo className="text-[#1a1a1a]" />
                        </Link>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={clsx(
                                            'relative flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all duration-200',
                                            isActive
                                                ? 'text-[#1a1a1a] bg-[#f3f3f3]'
                                                : 'text-gray-500 hover:text-[#1a1a1a] hover:bg-[#f8f8f8]'
                                        )}
                                    >
                                        <Icon size={15} strokeWidth={2} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right side - empty for balance */}
                    <div className="w-24"></div>
                </div>
            </div>
        </nav>
    );
}
