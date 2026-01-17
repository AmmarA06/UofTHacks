/**
 * =====================================================
 * AMPLITUDE ECOMMERCE HOOKS - ShelfSense Store
 * =====================================================
 *
 * This module provides the integration layer between the
 * ShelfSense storefront and Amplitude's experimentation platform.
 *
 * BEHAVIORAL STRATEGY MAPPING (from CLAUDE.md):
 * - PRODUCT_WINDOW_SHOPPED → Apply 30% Clearance Discount
 * - PRODUCT_CART_ABANDONED → Trigger Urgency Messaging
 * - PRODUCT_PURCHASED → Trigger Social Proof & Cross-Sell
 *
 * TARGETING SELECTORS:
 * - [data-amp-element] : All Amplitude-targetable elements
 * - [data-product-id]  : Product-specific targeting
 * - .amp-* classes     : Experiment hook classes
 * =====================================================
 */

import { AmplitudeClient, AmplitudeConfig } from '../amplitude-client.js';

(function () {
    'use strict';

    // =====================================================
    // CONFIGURATION
    // =====================================================

    const CONFIG = {
        // Product catalog from shared config
        products: AmplitudeConfig.products,

        // Discount tiers for experiments
        discountTiers: {
            clearance: 0.30,    // 30% for WINDOW_SHOPPED
            promotion: 0.15,   // 15% standard promo
            flash: 0.20        // 20% flash sale
        },

        // Urgency messaging templates
        urgencyMessages: {
            lowStock: 'Only {count} left in stock!',
            trending: 'Trending Now',
            bestSeller: 'Best Seller',
            hotItem: 'Hot Item 🔥',
            limitedTime: 'Limited Time Offer'
        },

        // Social proof templates
        socialProofTemplates: [
            'Someone in <strong>{city}</strong> just purchased a <strong>{product}</strong>',
            '<strong>{count} people</strong> are viewing this right now',
            '<strong>{count} sold</strong> in the last 24 hours'
        ],

        cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg']
    };

    // =====================================================
    // AMPLITUDE HOOKS API
    // =====================================================

    /**
     * AmplitudeHooks - Main API for Amplitude experiments
     * Expose this globally for Amplitude to call
     */
    window.AmplitudeHooks = {

        /**
         * Apply a discount to a specific product
         * Called when: PRODUCT_WINDOW_SHOPPED event received
         *
         * @param {string} productId - Product identifier (water_bottle, phone, apple)
         * @param {number} discountPercent - Discount as decimal (0.30 = 30%)
         * @param {string} badgeText - Optional badge text (e.g., "30% OFF")
         */
        applyDiscount: function (productId, discountPercent, badgeText) {
            const product = CONFIG.products[productId];
            if (!product) {
                console.warn(`[AmplitudeHooks] Unknown product: ${productId}`);
                return;
            }

            const currentPriceEl = document.getElementById(`current-price-${productId}`);
            const originalPriceEl = document.getElementById(`original-price-${productId}`);
            const discountBadgeEl = document.getElementById(`discount-badge-${productId}`);

            if (!currentPriceEl) return;

            const basePrice = product.basePrice;
            const discountedPrice = (basePrice * (1 - discountPercent)).toFixed(2);

            // Show original price with strikethrough
            if (originalPriceEl) {
                originalPriceEl.textContent = `$${basePrice.toFixed(2)}`;
                originalPriceEl.style.display = 'inline';
            }

            // Update current price
            currentPriceEl.textContent = `$${discountedPrice}`;
            currentPriceEl.classList.add('discounted', 'amp-price-updated');
            currentPriceEl.dataset.discountedPrice = discountedPrice;

            // Show discount badge
            if (discountBadgeEl && badgeText) {
                discountBadgeEl.textContent = badgeText;
                discountBadgeEl.style.display = 'block';
            }

            // Update add-to-cart button data
            const addToCartBtn = document.getElementById(`add-to-cart-${productId}`);
            if (addToCartBtn) {
                addToCartBtn.dataset.productPrice = discountedPrice;
            }

            // Log for debugging
            console.log(`[AmplitudeHooks] Applied ${(discountPercent * 100).toFixed(0)}% discount to ${productId}: $${basePrice} → $${discountedPrice}`);

            // Dispatch custom event for tracking
            this._dispatchEvent('amp:discount-applied', {
                productId,
                originalPrice: basePrice,
                discountedPrice: parseFloat(discountedPrice),
                discountPercent
            });
        },

        /**
         * Apply clearance discount (30% - matches CLAUDE.md directive)
         * Convenience method for PRODUCT_WINDOW_SHOPPED response
         */
        applyClearanceDiscount: function (productId) {
            this.applyDiscount(productId, CONFIG.discountTiers.clearance, '30% OFF');
        },

        /**
         * Remove discount from a product
         */
        removeDiscount: function (productId) {
            const product = CONFIG.products[productId];
            if (!product) return;

            const currentPriceEl = document.getElementById(`current-price-${productId}`);
            const originalPriceEl = document.getElementById(`original-price-${productId}`);
            const discountBadgeEl = document.getElementById(`discount-badge-${productId}`);

            if (currentPriceEl) {
                currentPriceEl.textContent = `$${product.basePrice.toFixed(2)}`;
                currentPriceEl.classList.remove('discounted');
                delete currentPriceEl.dataset.discountedPrice;
            }

            if (originalPriceEl) {
                originalPriceEl.style.display = 'none';
            }

            if (discountBadgeEl) {
                discountBadgeEl.style.display = 'none';
            }

            const addToCartBtn = document.getElementById(`add-to-cart-${productId}`);
            if (addToCartBtn) {
                addToCartBtn.dataset.productPrice = product.basePrice;
            }
        },

        /**
         * Show urgency badge on a product
         * Called when: PRODUCT_CART_ABANDONED event received
         *
         * @param {string} productId - Product identifier
         * @param {string} type - Badge type: 'lowStock', 'trending', 'bestSeller', 'hotItem', 'limitedTime'
         * @param {object} options - Additional options like stock count
         */
        showUrgencyBadge: function (productId, type, options = {}) {
            const badgeEl = document.getElementById(`badge-${productId}`);
            if (!badgeEl) return;

            let message = CONFIG.urgencyMessages[type] || type;

            // Replace placeholders
            if (options.count) {
                message = message.replace('{count}', options.count);
            }

            badgeEl.textContent = message;
            badgeEl.style.display = 'block';
            badgeEl.className = `product-badge amp-product-badge urgency-${type}`;

            console.log(`[AmplitudeHooks] Showing urgency badge on ${productId}: ${message}`);

            this._dispatchEvent('amp:urgency-shown', { productId, type, message });
        },

        /**
         * Show low stock urgency (matches CLAUDE.md directive for CART_ABANDONED)
         */
        showLowStockUrgency: function (productId, stockCount = 3) {
            this.showUrgencyBadge(productId, 'lowStock', { count: stockCount });
            this.updateStockStatus(productId, 'low', stockCount);
        },

        /**
         * Show trending badge
         */
        showTrendingBadge: function (productId) {
            this.showUrgencyBadge(productId, 'trending');
        },

        /**
         * Hide urgency badge
         */
        hideUrgencyBadge: function (productId) {
            const badgeEl = document.getElementById(`badge-${productId}`);
            if (badgeEl) {
                badgeEl.style.display = 'none';
            }
        },

        /**
         * Update stock status display
         */
        updateStockStatus: function (productId, status, count = null) {
            const stockStatusEl = document.getElementById(`stock-status-${productId}`);
            const stockTextEl = document.getElementById(`stock-text-${productId}`);

            if (!stockStatusEl || !stockTextEl) return;

            const indicator = stockStatusEl.querySelector('.stock-indicator');

            // Reset classes
            indicator.className = 'stock-indicator';
            stockTextEl.className = 'stock-text amp-stock-text';

            switch (status) {
                case 'low':
                    indicator.classList.add('low-stock');
                    stockTextEl.classList.add('low-stock');
                    stockTextEl.textContent = count ? `Only ${count} left!` : 'Low Stock';
                    break;
                case 'out':
                    indicator.classList.add('out-of-stock');
                    stockTextEl.classList.add('out-of-stock');
                    stockTextEl.textContent = 'Out of Stock';
                    break;
                default:
                    indicator.classList.add('in-stock');
                    stockTextEl.textContent = 'In Stock';
            }
        },

        /**
         * Show announcement bar with urgency message
         */
        showAnnouncement: function (message, options = {}) {
            const barEl = document.getElementById('announcement-bar');
            const textEl = document.getElementById('announcement-text');

            if (!barEl || !textEl) return;

            textEl.innerHTML = message;
            barEl.style.display = 'flex';

            // Auto-hide after duration
            if (options.duration) {
                setTimeout(() => this.hideAnnouncement(), options.duration);
            }

            console.log(`[AmplitudeHooks] Showing announcement: ${message}`);
        },

        /**
         * Hide announcement bar
         */
        hideAnnouncement: function () {
            const barEl = document.getElementById('announcement-bar');
            if (barEl) {
                barEl.style.display = 'none';
            }
        },

        /**
         * Add a social proof notification to the feed
         * Called when: PRODUCT_PURCHASED event received
         *
         * @param {string} productId - Product that was purchased
         * @param {object} options - Additional options
         */
        addSocialProofNotification: function (productId, options = {}) {
            const feedEl = document.getElementById('sales-feed-items');
            if (!feedEl) return;

            const product = CONFIG.products[productId];
            if (!product) return;

            const city = options.city || CONFIG.cities[Math.floor(Math.random() * CONFIG.cities.length)];
            const template = CONFIG.socialProofTemplates[0];
            const message = template
                .replace('{city}', city)
                .replace('{product}', product.name);

            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedItem.dataset.ampElement = 'feed-item';
            feedItem.innerHTML = `
                <span class="feed-icon">✓</span>
                <span class="feed-message">${message}</span>
                <span class="feed-time">Just now</span>
            `;

            // Insert at the beginning
            feedEl.insertBefore(feedItem, feedEl.firstChild);

            // Keep only last 5 items
            while (feedEl.children.length > 5) {
                feedEl.removeChild(feedEl.lastChild);
            }

            console.log(`[AmplitudeHooks] Added social proof: ${product.name} purchased in ${city}`);

            this._dispatchEvent('amp:social-proof-added', { productId, city, product: product.name });
        },

        /**
         * Update the "X people viewing" count
         */
        updateViewersCount: function (productId, count) {
            // This could update a viewers badge on the product
            console.log(`[AmplitudeHooks] ${count} people viewing ${productId}`);
        },

        /**
         * Show cross-sell recommendations
         * Called after PRODUCT_PURCHASED
         */
        showCrossSell: function (purchasedProductId, recommendedProductIds) {
            // Highlight recommended products
            recommendedProductIds.forEach(productId => {
                const card = document.getElementById(`product-card-${productId}`);
                if (card) {
                    card.classList.add('amp-highlight');
                }
            });

            console.log(`[AmplitudeHooks] Showing cross-sell for ${purchasedProductId}:`, recommendedProductIds);
        },

        /**
         * Send a behavioral event to Amplitude
         * Amplitude's AI Agent will analyze and decide on UI mutations
         *
         * @param {string} eventType - PRODUCT_WINDOW_SHOPPED, PRODUCT_CART_ABANDONED, PRODUCT_PURCHASED
         * @param {string} productId - Product identifier
         * @param {object} eventData - Additional event data
         */
        sendEvent: function (eventType, productId, eventData = {}) {
            console.log(`[AmplitudeHooks] Sending event: ${eventType} for ${productId}`);
            this.trackEvent(eventType, productId, eventData);
        },

        /**
         * Reset all experiments on a product
         */
        resetProduct: function (productId) {
            this.removeDiscount(productId);
            this.hideUrgencyBadge(productId);
            this.updateStockStatus(productId, 'in-stock');

            const card = document.getElementById(`product-card-${productId}`);
            if (card) {
                card.classList.remove('amp-highlight', 'amp-highlight-urgency', 'amp-highlight-discount');
            }
        },

        /**
         * Reset all products
         */
        resetAll: function () {
            Object.keys(CONFIG.products).forEach(productId => {
                this.resetProduct(productId);
            });
            this.hideAnnouncement();
        },

        /**
         * Get product configuration
         */
        getProduct: function (productId) {
            return CONFIG.products[productId];
        },

        /**
         * Get all products
         */
        getAllProducts: function () {
            return CONFIG.products;
        },

        // =====================================================
        // INTERNAL HELPERS
        // =====================================================

        _dispatchEvent: function (eventName, detail) {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        },

        /**
         * Track an event to Amplitude
         * Uses the centralized AmplitudeClient
         */
        trackEvent: function (eventType, productId, properties = {}) {
            const product = CONFIG.products[productId];
            if (!product) {
                console.warn(`[AmplitudeHooks] Unknown product: ${productId}`);
                return;
            }

            // Add instructions based on event type (for Amplitude AI Agent)
            let instructions = '';
            switch (eventType) {
                case 'PRODUCT_WINDOW_SHOPPED':
                    instructions = 'This item has low shelf velocity. Calculate a 30% clearance discount using the product\'s current price property, update the product\'s displayed price to the discounted value, and add a 30% discount tag for that product_name.';
                    break;
                case 'PRODUCT_CART_ABANDONED':
                    instructions = `This item has high intent but decision friction. Trigger an Urgency Directive. Deploy "Limited Stock" badges for this product_name to drive conversion.`;
                    break;
                case 'PRODUCT_PURCHASED':
                    instructions = `Successful conversion. Deploy a "Frequently Purchased" badge for this product_name to drive repeat purchases.`;
                    break;
            }

            const eventProperties = {
                product_id: productId,
                product_name: product.name,
                product_category: product.category,
                price: product.basePrice,
                sku: product.sku,
                Page_URL: window.location.href,
                ...properties,
                ...(instructions && { instructions }) // Add instructions if present
            };

            // Use the centralized AmplitudeClient
            if (AmplitudeClient.isReady()) {
                AmplitudeClient.track(eventType, eventProperties);
            } else {
                console.warn('[AmplitudeHooks] AmplitudeClient not initialized. Falling back to window.amplitude');
                
                // Fallback to window.amplitude if available
                if (window.amplitude && typeof window.amplitude.track === 'function') {
                    window.amplitude.track(eventType, eventProperties);
                    console.log(`[AmplitudeHooks] Tracked to Amplitude: ${eventType}`, eventProperties);
                } else {
                    console.error('[AmplitudeHooks] No Amplitude tracking available');
                }
            }

            this._dispatchEvent('amp:event-tracked', { eventType, productId, properties: eventProperties });
        }
    };

    // =====================================================
    // INITIALIZATION
    // =====================================================

    document.addEventListener('DOMContentLoaded', function () {
        console.log('[AmplitudeHooks] Initialized. Available methods:', Object.keys(window.AmplitudeHooks));

        // Set up announcement bar close button
        const closeBtn = document.getElementById('announcement-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                window.AmplitudeHooks.hideAnnouncement();
            });
        }
    });

})();

export default window.AmplitudeHooks;
