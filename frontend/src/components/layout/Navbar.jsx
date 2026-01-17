import { Link, useLocation } from 'react-router-dom';
import { Database, Home, Box, Boxes, Tags, Activity, Store } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Overview', icon: Home },
        { path: '/objects', label: 'Objects', icon: Box },
        { path: '/classes', label: 'Classes', icon: Tags },
        { path: '/events', label: 'Events', icon: Activity },
        { path: '/spatial', label: 'Spatial View', icon: Boxes },
        { path: '/store', label: 'Store', icon: Store },
    ];

    return (
        <nav className="h-16 border-b border-border bg-background-elevated/95 backdrop-blur-xl sticky top-0 z-50 w-full transition-all duration-300 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo Section */}
                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="bg-gradient-to-br from-accent via-accent to-accent-hover text-white p-2 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                                <Database size={18} strokeWidth={2.5} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-foreground group-hover:text-accent transition-colors">
                                VisualDB
                            </span>
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
                                            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'text-accent bg-accent/10 shadow-sm'
                                                : 'text-foreground-muted hover:text-foreground hover:bg-background-hover'
                                        )}
                                    >
                                        <Icon size={16} strokeWidth={2.5} />
                                        <span>{item.label}</span>
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-accent rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right side - placeholder for future features */}
                    <div className="flex items-center gap-3">
                        {/* Could add search, notifications, user menu here */}
                    </div>
                </div>
            </div>
        </nav>
    );
}
