/**
 * =====================================================
 * PRODUCT DETAIL PAGE - ShelfSense Store
 * =====================================================
 *
 * Handles product detail page functionality including:
 * - Loading product data from URL params
 * - Dynamic pricing display
 * - Quantity selection
 * - Related products
 * - Social proof integration
 * =====================================================
 */

(function() {
    'use strict';

    // =====================================================
    // PRODUCT DATA
    // =====================================================

    const PRODUCTS = {
        water_bottle: {
            id: 'water_bottle',
            sku: 'BOTTLE-001',
            name: 'Water Bottle',
            category: 'Hydration',
            categorySlug: 'water_bottle',
            price: 24.99,
            description: 'Premium insulated stainless steel water bottle designed for the modern lifestyle. Features double-wall vacuum insulation that keeps beverages cold for up to 24 hours or hot for up to 12 hours. BPA-free, leak-proof cap with one-handed operation. Perfect for gym, office, or outdoor adventures.',
            features: [
                'Double-wall vacuum insulation',
                '24-hour cold / 12-hour hot retention',
                'BPA-free stainless steel',
                'Leak-proof one-handed cap',
                '750ml capacity'
            ],
            image: `
                <svg viewBox="0 0 120 120" class="product-svg">
                    <defs>
                        <linearGradient id="bottle-gradient-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#3B82F6"/>
                            <stop offset="100%" style="stop-color:#1D4ED8"/>
                        </linearGradient>
                    </defs>
                    <rect x="40" y="20" width="40" height="10" rx="2" fill="#94A3B8"/>
                    <rect x="35" y="30" width="50" height="75" rx="8" fill="url(#bottle-gradient-lg)"/>
                    <rect x="42" y="40" width="36" height="55" rx="4" fill="#60A5FA" opacity="0.3"/>
                </svg>
            `
        },
        phone: {
            id: 'phone',
            sku: 'PHONE-001',
            name: 'Phone',
            category: 'Electronics',
            categorySlug: 'phone',
            price: 999.99,
            description: 'Experience the future of mobile technology with our latest flagship smartphone. Featuring a stunning 6.7" AMOLED display with 120Hz refresh rate, advanced AI-powered camera system, and all-day battery life. 5G connectivity ensures lightning-fast downloads and seamless streaming.',
            features: [
                '6.7" AMOLED 120Hz display',
                '108MP AI camera system',
                '5000mAh all-day battery',
                '5G connectivity',
                '256GB storage'
            ],
            image: `
                <svg viewBox="0 0 120 120" class="product-svg">
                    <defs>
                        <linearGradient id="phone-gradient-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#8B5CF6"/>
                            <stop offset="100%" style="stop-color:#6D28D9"/>
                        </linearGradient>
                    </defs>
                    <rect x="30" y="10" width="60" height="100" rx="8" fill="url(#phone-gradient-lg)"/>
                    <rect x="34" y="18" width="52" height="80" rx="2" fill="#1E1B4B"/>
                    <circle cx="60" cy="105" r="4" fill="#4C1D95"/>
                    <rect x="50" y="12" width="20" height="3" rx="1" fill="#4C1D95"/>
                </svg>
            `
        },
        apple: {
            id: 'apple',
            sku: 'FRUIT-001',
            name: 'Apple',
            category: 'Fresh Produce',
            categorySlug: 'fruit',
            price: 1.49,
            description: 'Farm-fresh organic Honeycrisp apple, handpicked at peak ripeness. Known for its perfect balance of sweet and tart flavors with an explosively crisp texture. Locally sourced from sustainable orchards, our apples are pesticide-free and packed with natural vitamins and fiber.',
            features: [
                'Certified organic',
                'Locally sourced',
                'Handpicked at peak ripeness',
                'No pesticides or chemicals',
                'Rich in vitamins and fiber'
            ],
            image: `
                <svg viewBox="0 0 120 120" class="product-svg">
                    <defs>
                        <linearGradient id="apple-gradient-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#EF4444"/>
                            <stop offset="100%" style="stop-color:#DC2626"/>
                        </linearGradient>
                        <linearGradient id="leaf-gradient-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#22C55E"/>
                            <stop offset="100%" style="stop-color:#16A34A"/>
                        </linearGradient>
                    </defs>
                    <ellipse cx="60" cy="65" rx="35" ry="40" fill="url(#apple-gradient-lg)"/>
                    <ellipse cx="60" cy="70" rx="30" ry="35" fill="#FCA5A5" opacity="0.2"/>
                    <path d="M60 25 Q65 15 75 20 Q70 30 60 35 Z" fill="url(#leaf-gradient-lg)"/>
                    <rect x="58" y="20" width="4" height="15" rx="2" fill="#78350F"/>
                </svg>
            `
        }
    };

    // =====================================================
    // PAGE STATE
    // =====================================================

    let currentProduct = null;
    let quantity = 1;

    // =====================================================
    // INITIALIZATION
    // =====================================================

    function init() {
        // Get product ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id') || 'water_bottle';

        // Load product
        loadProduct(productId);

        // Setup event handlers
        setupQuantityControls();
        setupAddToCart();
        setupRelatedProducts(productId);

        // Setup Amplitude hooks for PDP
        setupAmplitudeHooks(productId);
    }

    // =====================================================
    // PRODUCT LOADING
    // =====================================================

    function loadProduct(productId) {
        const product = PRODUCTS[productId];

        if (!product) {
            console.error('Product not found:', productId);
            window.location.href = 'index.html';
            return;
        }

        currentProduct = product;

        // Update page title
        document.title = `${product.name} | ShelfSense Store`;

        // Update breadcrumb
        const breadcrumbEl = document.getElementById('breadcrumb-product');
        if (breadcrumbEl) breadcrumbEl.textContent = product.name;

        // Update main image
        const imageEl = document.getElementById('product-main-image');
        if (imageEl) imageEl.innerHTML = product.image;

        // Update product info
        updateElement('pdp-category', product.category);
        updateElement('pdp-name', product.name);
        updateElement('pdp-sku', `SKU: ${product.sku}`);
        updateElement('pdp-current-price', `$${product.price.toFixed(2)}`);
        updateElement('pdp-description', product.description);

        // Set data attributes for tracking
        const currentPriceEl = document.getElementById('pdp-current-price');
        if (currentPriceEl) {
            currentPriceEl.dataset.productId = productId;
            currentPriceEl.dataset.basePrice = product.price;
        }

        // Setup add to cart button data
        const addToCartBtn = document.getElementById('pdp-add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.dataset.productId = productId;
            addToCartBtn.dataset.productName = product.name;
            addToCartBtn.dataset.productPrice = product.price;
        }

        console.log(`[ProductPage] Loaded product: ${product.name}`);
    }

    function updateElement(id, content) {
        const el = document.getElementById(id);
        if (el) el.textContent = content;
    }

    // =====================================================
    // QUANTITY CONTROLS
    // =====================================================

    function setupQuantityControls() {
        const qtyInput = document.getElementById('quantity');
        const decreaseBtn = document.getElementById('qty-decrease');
        const increaseBtn = document.getElementById('qty-increase');

        if (!qtyInput) return;

        decreaseBtn?.addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                qtyInput.value = quantity;
            }
        });

        increaseBtn?.addEventListener('click', () => {
            if (quantity < 10) {
                quantity++;
                qtyInput.value = quantity;
            }
        });

        qtyInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 10) val = 10;
            quantity = val;
            qtyInput.value = quantity;
        });
    }

    // =====================================================
    // ADD TO CART
    // =====================================================

    function setupAddToCart() {
        const addToCartBtn = document.getElementById('pdp-add-to-cart');
        const buyNowBtn = document.getElementById('pdp-buy-now');

        addToCartBtn?.addEventListener('click', function() {
            if (!currentProduct) return;

            // Get current price (might be discounted)
            const currentPriceEl = document.getElementById('pdp-current-price');
            const price = currentPriceEl?.dataset.discountedPrice || currentProduct.price;

            // Add to cart (uses store.js Cart)
            for (let i = 0; i < quantity; i++) {
                if (typeof Cart !== 'undefined') {
                    Cart.add({
                        id: currentProduct.id,
                        name: currentProduct.name,
                        price: price
                    });
                }
            }

            // Show toast
            if (typeof Toast !== 'undefined') {
                Toast.success(`${quantity}x ${currentProduct.name} added to cart!`);
            }

            // Track event
            window.dispatchEvent(new CustomEvent('amp:add-to-cart', {
                detail: {
                    product_id: currentProduct.id,
                    product_name: currentProduct.name,
                    price: parseFloat(price),
                    quantity: quantity,
                    source: 'pdp'
                }
            }));
        });

        buyNowBtn?.addEventListener('click', function() {
            // In a real app, this would go to checkout
            if (typeof Toast !== 'undefined') {
                Toast.info('Checkout not implemented in demo');
            }
        });
    }

    // =====================================================
    // RELATED PRODUCTS
    // =====================================================

    function setupRelatedProducts(currentProductId) {
        const gridEl = document.getElementById('related-products-grid');
        if (!gridEl) return;

        // Get other products
        const relatedProducts = Object.values(PRODUCTS)
            .filter(p => p.id !== currentProductId);

        gridEl.innerHTML = relatedProducts.map(product => `
            <a href="product.html?id=${product.id}" class="related-card" data-product-id="${product.id}">
                <div class="related-image">
                    ${product.image}
                </div>
                <div class="related-name">${product.name}</div>
                <div class="related-price">$${product.price.toFixed(2)}</div>
            </a>
        `).join('');
    }

    // =====================================================
    // AMPLITUDE HOOKS FOR PDP
    // =====================================================

    function setupAmplitudeHooks(productId) {
        // Extend AmplitudeHooks for PDP-specific functionality
        if (!window.AmplitudeHooks) return;

        // Override or extend methods for PDP
        const originalApplyDiscount = window.AmplitudeHooks.applyDiscount.bind(window.AmplitudeHooks);

        window.AmplitudeHooks.applyDiscountPDP = function(discountPercent, badgeText) {
            if (!currentProduct) return;

            const basePrice = currentProduct.price;
            const discountedPrice = (basePrice * (1 - discountPercent)).toFixed(2);

            // Update PDP price elements
            const currentPriceEl = document.getElementById('pdp-current-price');
            const originalPriceEl = document.getElementById('pdp-original-price');
            const discountBadgeEl = document.getElementById('pdp-discount-badge');
            const savingsEl = document.getElementById('pdp-savings');
            const savingsAmountEl = document.getElementById('pdp-savings-amount');

            if (originalPriceEl) {
                originalPriceEl.textContent = `$${basePrice.toFixed(2)}`;
                originalPriceEl.style.display = 'inline';
            }

            if (currentPriceEl) {
                currentPriceEl.textContent = `$${discountedPrice}`;
                currentPriceEl.classList.add('discounted', 'amp-price-updated');
                currentPriceEl.dataset.discountedPrice = discountedPrice;
            }

            if (discountBadgeEl && badgeText) {
                discountBadgeEl.textContent = badgeText;
                discountBadgeEl.style.display = 'block';
            }

            if (savingsEl && savingsAmountEl) {
                const savings = (basePrice - parseFloat(discountedPrice)).toFixed(2);
                savingsAmountEl.textContent = `$${savings}`;
                savingsEl.style.display = 'block';
            }

            // Update add to cart button
            const addToCartBtn = document.getElementById('pdp-add-to-cart');
            if (addToCartBtn) {
                addToCartBtn.dataset.productPrice = discountedPrice;
            }

            console.log(`[AmplitudeHooks] Applied PDP discount: $${basePrice} → $${discountedPrice}`);
        };

        window.AmplitudeHooks.showUrgencyBadgePDP = function(type, options = {}) {
            const badgeEl = document.getElementById('pdp-badge');
            const viewersEl = document.getElementById('pdp-viewers');
            const viewerCountEl = document.getElementById('pdp-viewer-count');

            const messages = {
                lowStock: 'Only {count} left in stock!',
                trending: 'Trending Now',
                bestSeller: 'Best Seller',
                hotItem: 'Hot Item',
                limitedTime: 'Limited Time Offer'
            };

            let message = messages[type] || type;
            if (options.count) {
                message = message.replace('{count}', options.count);
            }

            if (badgeEl) {
                badgeEl.textContent = message;
                badgeEl.style.display = 'block';
            }

            // Show viewers if specified
            if (options.viewers && viewersEl && viewerCountEl) {
                viewerCountEl.textContent = options.viewers;
                viewersEl.style.display = 'flex';
            }
        };

        window.AmplitudeHooks.addPDPSocialProof = function(city) {
            const listEl = document.getElementById('pdp-recent-sales');
            if (!listEl || !currentProduct) return;

            const cities = ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'];
            const selectedCity = city || cities[Math.floor(Math.random() * cities.length)];
            const time = ['Just now', '1 min ago', '2 min ago', '5 min ago'][Math.floor(Math.random() * 4)];

            const item = document.createElement('div');
            item.className = 'sale-item';
            item.innerHTML = `
                <div class="sale-icon">✓</div>
                <div class="sale-info">
                    Someone in <strong>${selectedCity}</strong> just purchased a <strong>${currentProduct.name}</strong>
                </div>
                <div class="sale-time">${time}</div>
            `;

            listEl.insertBefore(item, listEl.firstChild);

            // Keep only last 5
            while (listEl.children.length > 5) {
                listEl.removeChild(listEl.lastChild);
            }
        };

        // Auto-apply strategy if product matches current URL
        window.AmplitudeHooks.applyStrategyPDP = function(eventType, eventProductId) {
            if (eventProductId !== productId) return;

            switch (eventType) {
                case 'PRODUCT_WINDOW_SHOPPED':
                    this.applyDiscountPDP(0.30, '30% OFF');
                    break;
                case 'PRODUCT_CART_ABANDONED':
                    this.showUrgencyBadgePDP('lowStock', { count: 3, viewers: 12 });
                    this.updateStockStatus(productId, 'low', 3);
                    break;
                case 'PRODUCT_PURCHASED':
                    this.addPDPSocialProof();
                    break;
            }
        };
    }

    // =====================================================
    // DEMO CONTROLS
    // =====================================================

    window.PDPDemo = {
        applyDiscount: function(percent = 0.30) {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.applyDiscountPDP(percent, `${Math.round(percent * 100)}% OFF`);
            }
        },

        showUrgency: function() {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.showUrgencyBadgePDP('lowStock', { count: 3, viewers: 15 });
            }
        },

        addSocialProof: function() {
            if (window.AmplitudeHooks) {
                window.AmplitudeHooks.addPDPSocialProof();
            }
        }
    };

    // =====================================================
    // RUN
    // =====================================================

    document.addEventListener('DOMContentLoaded', init);

})();
