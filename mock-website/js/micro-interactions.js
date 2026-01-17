/**
 * HIGH-PRECISION GLASS MICRO-INTERACTIONS
 * ========================================
 * Apple hardware polish × Amplitude analytical sophistication
 *
 * Features:
 * 1. Magnetic Hover - Buttons pull toward cursor
 * 2. Luminous Scroll - Cards catch specular highlights
 * 3. Masked Reveals - Images emerge from glass
 */

(function() {
    'use strict';

    // ══════════════════════════════════════════════════════
    // MAGNETIC HOVER EFFECT
    // Buttons have a subtle magnetic pull toward the cursor
    // ══════════════════════════════════════════════════════

    const MAGNETIC_STRENGTH = 0.3;
    const MAGNETIC_RADIUS = 80;

    function initMagneticButtons() {
        const buttons = document.querySelectorAll('.btn, .add-to-cart-btn, .quick-add-btn, .btn-large');

        buttons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const distanceX = e.clientX - centerX;
                const distanceY = e.clientY - centerY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                if (distance < MAGNETIC_RADIUS) {
                    const strength = (1 - distance / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
                    const moveX = distanceX * strength;
                    const moveY = distanceY * strength;

                    button.style.setProperty('--magnetic-x', `${moveX}px`);
                    button.style.setProperty('--magnetic-y', `${moveY}px`);
                }
            });

            button.addEventListener('mouseleave', () => {
                button.style.setProperty('--magnetic-x', '0px');
                button.style.setProperty('--magnetic-y', '0px');
            });
        });
    }

    // ══════════════════════════════════════════════════════
    // LUMINOUS SCROLL - SPECULAR HIGHLIGHT EFFECT
    // Cards catch light as user scrolls, simulating
    // the way physical glass catches specular highlights
    // ══════════════════════════════════════════════════════

    let ticking = false;
    let lastScrollY = 0;

    function updateSpecularHighlights() {
        const cards = document.querySelectorAll('.product-card, .related-card, .sale-item');
        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.top + rect.height / 2;

            // Calculate how far the card is from the viewport center
            const viewportCenter = viewportHeight / 2;
            const distanceFromCenter = cardCenter - viewportCenter;
            const normalizedPosition = distanceFromCenter / viewportHeight;

            // Calculate specular position (0-100%)
            const specularX = 50 + (normalizedPosition * 60);
            const clampedX = Math.max(0, Math.min(100, specularX));

            // Calculate opacity based on visibility
            const isVisible = rect.top < viewportHeight && rect.bottom > 0;
            const centerProximity = 1 - Math.abs(normalizedPosition);
            const opacity = isVisible ? Math.max(0, centerProximity * 0.6) : 0;

            card.style.setProperty('--specular-x', `${clampedX}%`);
            card.style.setProperty('--specular-opacity', opacity.toFixed(2));
        });

        ticking = false;
    }

    function onScroll() {
        lastScrollY = window.scrollY;

        if (!ticking) {
            requestAnimationFrame(() => {
                updateSpecularHighlights();
                ticking = false;
            });
            ticking = true;
        }
    }

    function initLuminousScroll() {
        window.addEventListener('scroll', onScroll, { passive: true });
        // Initial calculation
        updateSpecularHighlights();
    }

    // ══════════════════════════════════════════════════════
    // MASKED REVEAL ANIMATIONS
    // Product images emerge from the glass surface
    // using Intersection Observer for performance
    // ══════════════════════════════════════════════════════

    function initMaskedReveals() {
        const images = document.querySelectorAll('.product-image');

        if (!images.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add staggered delay based on index
                    const allImages = document.querySelectorAll('.product-image');
                    const index = Array.from(allImages).indexOf(entry.target);
                    const delay = (index % 4) * 100; // Stagger by 100ms within each row

                    setTimeout(() => {
                        entry.target.classList.add('reveal');
                    }, delay);

                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        images.forEach(image => {
            observer.observe(image);
        });
    }

    // ══════════════════════════════════════════════════════
    // SPARKLINE STOCK VISUALIZATION
    // Mini bar chart showing stock levels
    // ══════════════════════════════════════════════════════

    function createSparkline(container, level) {
        // level: 'high' (8-10), 'medium' (4-7), 'low' (1-3), 'out' (0)
        const bars = 5;
        const sparkline = document.createElement('div');
        sparkline.className = 'stock-sparkline';

        let activeBars;
        let barClass;

        switch(level) {
            case 'high':
                activeBars = 5;
                barClass = 'active';
                break;
            case 'medium':
                activeBars = 3;
                barClass = 'warning';
                break;
            case 'low':
                activeBars = 1;
                barClass = 'danger';
                break;
            default:
                activeBars = 0;
                barClass = '';
        }

        for (let i = 0; i < bars; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            // Varying heights for visual interest
            const heights = [6, 10, 14, 10, 8];
            bar.style.height = `${heights[i]}px`;

            if (i < activeBars) {
                bar.classList.add(barClass);
            }

            sparkline.appendChild(bar);
        }

        container.appendChild(sparkline);
    }

    function initSparklines() {
        const stockStatuses = document.querySelectorAll('.stock-status');

        stockStatuses.forEach(status => {
            // Skip if sparkline already exists
            if (status.querySelector('.stock-sparkline')) return;

            const indicator = status.querySelector('.stock-indicator');
            let level = 'high';

            if (indicator) {
                if (indicator.classList.contains('low-stock')) {
                    level = 'low';
                } else if (indicator.classList.contains('out-of-stock')) {
                    level = 'out';
                } else if (indicator.classList.contains('in-stock')) {
                    level = 'high';
                }
            }

            createSparkline(status, level);
        });
    }

    // ══════════════════════════════════════════════════════
    // HEADER SCROLL BEHAVIOR
    // Subtle blur intensification on scroll
    // ══════════════════════════════════════════════════════

    function initHeaderScrollEffect() {
        const header = document.querySelector('.site-header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;

            if (currentScroll > 50) {
                header.style.setProperty('--header-blur', '32px');
                header.style.background = 'rgba(3, 3, 3, 0.85)';
            } else {
                header.style.setProperty('--header-blur', '24px');
                header.style.background = 'var(--glass-bg)';
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // ══════════════════════════════════════════════════════
    // SMOOTH ENTRANCE ANIMATIONS
    // Staggered fade-in for page elements
    // ══════════════════════════════════════════════════════

    function initEntranceAnimations() {
        const animatedElements = document.querySelectorAll(
            '.hero-title, .hero-subtitle, .btn-primary, .section-title, .section-subtitle'
        );

        animatedElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 100 + (index * 100));
        });
    }

    // ══════════════════════════════════════════════════════
    // BUTTON RIPPLE EFFECT
    // Subtle ripple on click for tactile feedback
    // ══════════════════════════════════════════════════════

    function initButtonRipples() {
        const buttons = document.querySelectorAll('.btn-primary, .add-to-cart-btn');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const rect = button.getBoundingClientRect();
                const ripple = document.createElement('span');

                ripple.style.cssText = `
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    animation: ripple 0.6s ease-out forwards;
                    pointer-events: none;
                    left: ${e.clientX - rect.left}px;
                    top: ${e.clientY - rect.top}px;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Add ripple keyframes if not exists
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: translate(-50%, -50%) scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ══════════════════════════════════════════════════════
    // INITIALIZATION
    // ══════════════════════════════════════════════════════

    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAll);
        } else {
            initAll();
        }
    }

    function initAll() {
        initMagneticButtons();
        initLuminousScroll();
        initMaskedReveals();
        initSparklines();
        initHeaderScrollEffect();
        initEntranceAnimations();
        initButtonRipples();

        console.log('[Micro-Interactions] High-Precision Glass system initialized');
    }

    // Start initialization
    init();

    // Expose API for dynamic content
    window.MicroInteractions = {
        refreshMagneticButtons: initMagneticButtons,
        refreshLuminousScroll: updateSpecularHighlights,
        refreshMaskedReveals: initMaskedReveals,
        refreshSparklines: initSparklines,
        addSparkline: createSparkline
    };

})();
