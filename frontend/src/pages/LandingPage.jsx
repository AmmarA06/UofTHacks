import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ArrowRight, Play, ChevronDown } from 'lucide-react';

// Custom Identify logo - abstract eye/lens shape
const IdentifyLogo = ({ className = "" }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <circle cx="16" cy="16" r="2" fill="white" />
    </svg>
);

export function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div id="top" className="min-h-screen bg-[#fafafa] font-sans text-[#1a1a1a] selection:bg-black selection:text-white antialiased scroll-smooth">
            {/* Header */}
            <header className={clsx(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 lg:px-12",
                scrolled ? "py-4 bg-white/90 backdrop-blur-md border-b border-gray-100" : "py-6 bg-transparent"
            )}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <a href="#top" className="flex items-center">
                        <IdentifyLogo className="text-[#1a1a1a]" />
                    </a>

                    <nav className="hidden md:flex items-center gap-8 text-[15px] text-gray-500 absolute left-1/2 -translate-x-1/2">
                        <a href="#features" className="hover:text-[#1a1a1a] transition-colors">Features</a>
                        <a href="#demo" className="hover:text-[#1a1a1a] transition-colors">Demo</a>
                        <a href="#analytics" className="hover:text-[#1a1a1a] transition-colors">Analytics</a>
                        <a href="#agents" className="hover:text-[#1a1a1a] transition-colors">AI Agents</a>
                    </nav>

                    <div className="flex items-center">
                        <Link to="/dashboard" className="bg-[#1a1a1a] text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-black transition-colors">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-[42px] md:text-[60px] font-normal tracking-[-0.03em] leading-[1.08] mb-8 text-[#1a1a1a]"
                >
                    Bridge Physical Inventory<br />
                    to Digital Intelligence
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-[17px] text-gray-500 max-w-lg mb-10 leading-[1.6]"
                >
                    Identify tracks physical objects in real-time, syncs with your online store, and delivers AI-powered insights to optimize stock decisions.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <Link to="/dashboard" className="bg-[#1a1a1a] text-white text-[15px] font-medium px-7 py-3.5 rounded-full hover:bg-black transition-all">
                        Start tracking
                    </Link>
                </motion.div>
            </section>

            {/* Video/Demo Section */}
            <section id="demo" className="px-6 lg:px-12 pb-32">

                <div className="max-w-7xl mx-auto">
                    <div
                        className="relative w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #0f0f0f 50%, #1a1a1a 75%, #0a0a0a 100%)',
                        }}
                    >
                        {/* Subtle noise overlay */}
                        <div className="absolute inset-0 opacity-[0.03]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        }} />

                        {/* Gradient orbs */}
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-gray-800/30 to-transparent rounded-full blur-3xl" />
                        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-gray-700/20 to-transparent rounded-full blur-3xl" />

                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <motion.h2
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="text-4xl md:text-6xl font-normal text-white tracking-[-0.02em] mb-8"
                            >
                                Real-time Detection
                            </motion.h2>
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 px-5 py-2.5 rounded-full hover:bg-white/20 transition-all flex items-center gap-3 text-[14px]"
                            >
                                <span className="bg-white text-black p-1.5 rounded-full"><Play size={10} fill="currentColor" /></span>
                                Watch demo
                            </motion.button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Section */}
            <section id="features" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">

                <div className="mb-16">
                    <h2 className="text-[32px] md:text-[40px] font-normal tracking-[-0.02em] mb-4">See Your Stock. Sync Instantly.</h2>
                    <p className="text-[16px] text-gray-500 max-w-md leading-[1.6]">
                        Every object tracked. Every change captured. Your physical and digital inventory, perfectly aligned.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-4">
                        <div className="w-10 h-10 flex items-center justify-center mb-2">
                            <div className="grid grid-cols-2 gap-1">
                                <span className="w-3.5 h-3.5 rounded-full bg-[#1a1a1a]"></span>
                                <span className="w-3.5 h-3.5 rounded-full bg-[#1a1a1a]"></span>
                                <span className="w-3.5 h-3.5 rounded-full bg-[#1a1a1a]"></span>
                                <span className="w-3.5 h-3.5 rounded-full bg-[#1a1a1a]"></span>
                            </div>
                        </div>
                        <h3 className="text-[20px] font-medium tracking-[-0.01em]">Object Recognition</h3>
                        <p className="text-gray-500 leading-[1.6] text-[15px]">
                            Kinect-powered detection identifies and tracks every item in your physical space as it enters or leaves the camera view.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="w-10 h-10 flex items-center justify-center mb-2">
                            <span className="w-4 h-4 bg-[#1a1a1a] rounded-full"></span>
                        </div>
                        <h3 className="text-[20px] font-medium tracking-[-0.01em]">Real-time Sync</h3>
                        <p className="text-gray-500 leading-[1.6] text-[15px]">
                            Physical inventory changes reflect instantly in your database and online store. No manual updates, zero discrepancies.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="w-10 h-10 flex items-center justify-center mb-2">
                            <div className="flex">
                                <span className="w-3 h-6 bg-[#1a1a1a] rounded-l-full"></span>
                                <span className="w-3 h-6 bg-[#1a1a1a]/40 rounded-r-full"></span>
                            </div>
                        </div>
                        <h3 className="text-[20px] font-medium tracking-[-0.01em]">AI-Powered Insights</h3>
                        <p className="text-gray-500 leading-[1.6] text-[15px]">
                            Intelligent agents analyze movement patterns and generate actionable recommendations for stock optimization.
                        </p>
                    </div>
                </div>
            </section>

            {/* AI Analytics Section */}
            <section id="analytics" className="py-16 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#f3f3f3] rounded-2xl p-10 lg:p-12 flex flex-col justify-center min-h-[400px]">
                        <span className="text-[13px] text-orange-500 font-medium mb-3 uppercase tracking-wider">Analytics Engine</span>
                        <h3 className="text-[26px] md:text-[30px] font-medium tracking-[-0.02em] mb-4 leading-[1.2]">Funnel charts that reveal truth</h3>
                        <p className="text-gray-500 leading-[1.6] text-[15px] mb-6 max-w-sm">
                            Amplitude-style visualizations show exactly how objects flow through your space. Spot bottlenecks, understand engagement, and optimize placement.
                        </p>
                        <a href="#" className="text-[14px] text-orange-500 font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all w-fit">
                            Explore Analytics <ArrowRight size={14} />
                        </a>
                    </div>

                    <div className="bg-[#f3f3f3] rounded-2xl p-10 lg:p-12 flex items-center justify-center min-h-[400px] overflow-hidden">
                        <div className="relative">
                            <div className="text-[9px] font-mono leading-[1.4] text-center select-none">
                                {Array.from({ length: 12 }).map((_, row) => (
                                    <div key={row} className="whitespace-nowrap" style={{ opacity: 0.4 + Math.sin(row * 0.5) * 0.3 }}>
                                        {Array.from({ length: 28 }).map((_, col) => (
                                            <span
                                                key={col}
                                                style={{
                                                    color: `hsl(${25 + (row * 4) + (col * 2)}, 55%, ${50 + ((row + col) % 15)}%)`,
                                                }}
                                            >
                                                {Math.floor(Math.random() * 10)}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Agents Section */}
            <section id="agents" className="py-16 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#f3f3f3] rounded-2xl p-10 lg:p-12 flex flex-col justify-center min-h-[400px]">
                        <span className="text-[13px] text-gray-400 font-medium mb-3 uppercase tracking-wider">AI Agents</span>
                        <h3 className="text-[26px] md:text-[30px] font-medium tracking-[-0.02em] mb-4 leading-[1.2]">Autonomous stock optimization</h3>
                        <p className="text-gray-500 leading-[1.6] text-[15px] mb-6 max-w-sm">
                            AI agents continuously monitor your inventory, predict demand shifts, and automatically adjust online listings based on physical stock changes.
                        </p>
                        <a href="#" className="text-[14px] text-[#1a1a1a] font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all w-fit">
                            Learn about Agents <ArrowRight size={14} />
                        </a>
                    </div>

                    <div className="bg-[#f3f3f3] rounded-2xl p-8 flex items-center justify-center min-h-[400px] overflow-hidden">
                        <div className="grid grid-cols-10 gap-3 w-full max-w-[320px]">
                            {Array.from({ length: 100 }).map((_, i) => {
                                const row = Math.floor(i / 10);
                                const col = i % 10;
                                const centerX = 4.5;
                                const centerY = 4.5;
                                const dist = Math.sqrt(Math.pow(row - centerY, 2) + Math.pow(col - centerX, 2));
                                const maxDist = Math.sqrt(2 * Math.pow(4.5, 2));
                                const normalizedDist = dist / maxDist;
                                const baseOpacity = 1 - normalizedDist * 0.7;
                                const animationDelay = dist * 0.1;

                                return (
                                    <div
                                        key={i}
                                        className="aspect-square rounded-full bg-[#1a1a1a]"
                                        style={{
                                            opacity: Math.max(0.1, baseOpacity),
                                            animation: `pulse-dot 2.5s ease-in-out ${animationDelay}s infinite`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <style>{`
                            @keyframes pulse-dot {
                                0%, 100% { 
                                    transform: scale(1); 
                                    opacity: var(--base-opacity, 0.3);
                                }
                                50% { 
                                    transform: scale(1.15); 
                                    opacity: 1;
                                }
                            }
                        `}</style>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-[32px] md:text-[40px] font-normal tracking-[-0.02em] mb-5">Ready to unify your inventory?</h2>
                    <p className="text-[16px] text-gray-500 mb-10 leading-[1.6]">
                        Join retailers who trust Identify to bridge physical and digital stock seamlessly.
                    </p>
                    <Link to="/dashboard" className="bg-[#1a1a1a] text-white text-[15px] font-medium px-7 py-3.5 rounded-full hover:bg-black transition-all inline-flex items-center gap-2">
                        Start tracking today <ArrowRight size={14} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 px-6 border-t border-gray-200/60">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[13px] text-gray-400">
                    <p>© 2024 Identify Inc.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-[#1a1a1a] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#1a1a1a] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[#1a1a1a] transition-colors">Twitter</a>
                        <a href="#" className="hover:text-[#1a1a1a] transition-colors">LinkedIn</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
