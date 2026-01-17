/**
 * =====================================================
 * STORE FUNCTIONALITY - ShelfSense Store
 * =====================================================
 *
 * Core e-commerce functionality including:
 * - Cart management
 * - Add to cart interactions
 * - Toast notifications
 * - Social proof simulation
 *
 * All interactions are designed to be trackable by Amplitude.
 * =====================================================
 */

(function() {
    'use strict';

    // =====================================================
    // CART STATE
    // =====================================================

    const Cart = {
        items: [],

        add: function(product) {
            const existing = this.items.find(item => item.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    quantity: 1
                });
            }
            this.updateUI();
            this.save();

            // Dispatch event for Amplitude tracking
            window.dispatchEvent(new CustomEvent('cart:item-added', {
                detail: { product, cart: this.items }
            }));

            return this;
        },

        remove: function(productId) {
            this.items = this.items.filter(item => item.id !== productId);
            this.updateUI();
            this.save();
            return this;
        },

        clear: function() {
            this.items = [];
            this.updateUI();
            this.save();
            return this;
        },

        getTotal: function() {
            return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        getCount: function() {
            return this.items.reduce((sum, item) => sum + item.quantity, 0);
        },

        updateUI: function() {
            const countEl = document.getElementById('cart-count');
            if (countEl) {
                const count = this.getCount();
                countEl.textContent = count;
                countEl.dataset.count = count;
                countEl.style.display = count > 0 ? 'flex' : 'none';
            }
        },

        save: function() {
            try {
                localStorage.setItem('shelfsense_cart', JSON.stringify(this.items));
            } catch (e) {
                console.warn('Could not save cart to localStorage');
            }
        },

        load: function() {
            try {
                const saved = localStorage.getItem('shelfsense_cart');
                if (saved) {
                    this.items = JSON.parse(saved);
                    this.updateUI();
                }
            } catch (e) {
                console.warn('Could not load cart from localStorage');
            }
        }
    };

    // =====================================================
    // TOAST NOTIFICATIONS
    // =====================================================

    const Toast = {
        container: null,

        init: function() {
            this.container = document.getElementById('toast-container');
        },

        show: function(message, type = 'success', duration = 3000) {
            if (!this.container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <span class="toast-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
                <span class="toast-message">${message}</span>
            `;

            this.container.appendChild(toast);

            // Auto-remove after duration
            setTimeout(() => {
                toast.classList.add('toast-out');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        success: function(message) {
            this.show(message, 'success');
        },

        info: function(message) {
            this.show(message, 'info');
        }
    };

    // =====================================================
    // SOCIAL PROOF SIMULATOR
    // =====================================================

    const SocialProof = {
        products: ['Water Bottle', 'Phone', 'Apple'],
        cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Halifax'],
        interval: null,

        start: function(intervalMs = 15000) {
            // Don't auto-start - let Amplitude control this
            // This is here for demo purposes
        },

        addRandomNotification: function() {
            const product = this.products[Math.floor(Math.random() * this.products.length)];
            const city = this.cities[Math.floor(Math.random() * this.cities.length)];

            const productId = product.toLowerCase().replace(' ', '_');
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.addSocialProofNotification(productId, { city });
            }
        },

        stop: function() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    };

    // =====================================================
    // EVENT HANDLERS
    // =====================================================

    function setupEventHandlers() {
        // Add to Cart buttons
        document.querySelectorAll('.add-to-cart-btn, .quick-add-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();

                const productId = this.dataset.productId;
                const productName = this.dataset.productName || productId;
                const productPrice = this.dataset.productPrice;

                Cart.add({
                    id: productId,
                    name: productName,
                    price: productPrice
                });

                Toast.success(`${productName} added to cart!`);

                // Add visual feedback
                this.classList.add('added');
                setTimeout(() => this.classList.remove('added'), 500);

                // Track for Amplitude
                window.dispatchEvent(new CustomEvent('amp:add-to-cart', {
                    detail: {
                        product_id: productId,
                        product_name: productName,
                        price: parseFloat(productPrice)
                    }
                }));
            });
        });

        // Cart button click
        const cartBtn = document.getElementById('cart-button');
        if (cartBtn) {
            cartBtn.addEventListener('click', function() {
                // In a real app, this would open a cart drawer/modal
                const total = Cart.getTotal().toFixed(2);
                const count = Cart.getCount();

                if (count > 0) {
                    Toast.info(`Cart: ${count} item(s) - $${total}`);
                } else {
                    Toast.info('Your cart is empty');
                }
            });
        }

        // Product card hover tracking
        document.querySelectorAll('.product-card').forEach(card => {
            let hoverStart = null;

            card.addEventListener('mouseenter', function() {
                hoverStart = Date.now();
            });

            card.addEventListener('mouseleave', function() {
                if (hoverStart) {
                    const dwellTime = Date.now() - hoverStart;
                    const productId = this.dataset.productId;

                    // Only track meaningful hovers (> 500ms)
                    if (dwellTime > 500) {
                        window.dispatchEvent(new CustomEvent('amp:product-hover', {
                            detail: {
                                product_id: productId,
                                dwell_time_ms: dwellTime
                            }
                        }));
                    }
                }
            });
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // =====================================================
    // DEMO CONTROLS (for testing without Amplitude)
    // =====================================================

    window.ShelfSenseDemo = {
        /**
         * Send WINDOW_SHOPPED event to Amplitude
         * Amplitude AI Agent will decide to apply discount
         */
        simulateWindowShopped: function(productId) {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.sendEvent('PRODUCT_WINDOW_SHOPPED', productId);
            }
        },

        /**
         * Send CART_ABANDONED event to Amplitude
         * Amplitude AI Agent will decide to show urgency messaging
         */
        simulateCartAbandoned: function(productId) {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.sendEvent('PRODUCT_CART_ABANDONED', productId);
            }
        },

        /**
         * Send PURCHASED event to Amplitude
         * Amplitude AI Agent will decide to trigger social proof
         */
        simulatePurchased: function(productId) {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.sendEvent('PRODUCT_PURCHASED', productId);
            }
        },

        /**
         * Reset all UI states (for testing)
         */
        reset: function() {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.resetAll();
            }
        },

        /**
         * Run a demo that sends events to Amplitude
         * UI changes will come from Amplitude's AI Agent decisions
         */
        runDemo: function() {
            console.log('🎬 Starting ShelfSense Demo - Sending events to Amplitude...');

            setTimeout(() => {
                console.log('📦 Sending PRODUCT_WINDOW_SHOPPED for Water Bottle...');
                this.simulateWindowShopped('water_bottle');
            }, 1000);

            setTimeout(() => {
                console.log('📱 Sending PRODUCT_CART_ABANDONED for Phone...');
                this.simulateCartAbandoned('phone');
            }, 3000);

            setTimeout(() => {
                console.log('🍎 Sending PRODUCT_PURCHASED for Apple...');
                this.simulatePurchased('apple');
            }, 5000);

            setTimeout(() => {
                console.log('📱 Sending PRODUCT_PURCHASED for Phone...');
                this.simulatePurchased('phone');
            }, 7000);

            console.log('✅ Events will be sent over the next 7 seconds.');
            console.log('📊 Check Amplitude dashboard for incoming events.');
            console.log('🤖 Amplitude AI Agent will push UI mutations back to this page.');
        }
    };

    // =====================================================
    // INITIALIZATION
    // =====================================================

    document.addEventListener('DOMContentLoaded', function() {
        // Initialize components
        Toast.init();
        Cart.load();

        // Setup event handlers
        setupEventHandlers();

        // Log ready state
        console.log('🏪 ShelfSense Store initialized');
        console.log('📊 Demo controls available at window.ShelfSenseDemo');
        console.log('   - ShelfSenseDemo.runDemo() - Run full demo');
        console.log('   - ShelfSenseDemo.simulateWindowShopped("water_bottle")');
        console.log('   - ShelfSenseDemo.simulateCartAbandoned("phone")');
        console.log('   - ShelfSenseDemo.simulatePurchased("apple")');
        console.log('   - ShelfSenseDemo.reset() - Reset all experiments');
    });

})();
