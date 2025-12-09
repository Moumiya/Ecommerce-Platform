import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://lpsrfdhtwiisxblqltlq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwc3JmZGh0d2lpc3hibHFsdGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTI3NTgsImV4cCI6MjA3NzI4ODc1OH0.cUThtH0hI2PMvoYklly18w0aGxqLXBus7_dRwlT1aJI";
const supabase = createClient(supabaseUrl, supabaseKey);

let cart = [];
let products = [];
let categories = [];
let currentCategory = 'all';
let sessionId = getOrCreateSessionId();

function getOrCreateSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', id);
  }
  return id;
}

async function init() {
  await loadProducts();
  await loadCartFromDB();
  setupEventListeners();
}

async function loadProducts() {
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      categories (name)
    `)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error loading products:', productsError);
    return;
  }

  products = productsData;
  renderProducts();
}

async function loadCartFromDB() {
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (*)
    `)
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error loading cart:', error);
    return;
  }

  cart = cartItems.map(item => ({
    cartId: item.id,
    product: item.products,
    quantity: item.quantity
  }));

  updateCartUI();
}

function renderProducts() {
  const productsGrid = document.getElementById('productsGrid');

  let filteredProducts = products;
  if (currentCategory !== 'all') {
    filteredProducts = products.filter(p => p.categories?.name === currentCategory);
  }

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = '<p style="text-align: center; color: var(--text-gray); grid-column: 1/-1;">No products found</p>';
    return;
  }

  productsGrid.innerHTML = filteredProducts.map((product, index) => `
    <div class="product-card" style="animation-delay: ${index * 0.1}s">
      <img src="${product.image_url}" alt="${product.name}" class="product-image" />
      <div class="product-info">
        <div class="product-category">${product.categories?.name || 'Uncategorized'}</div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
          <button class="add-to-cart-button" data-id="${product.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.add-to-cart-button').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

async function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingCartItem = cart.find(item => item.product.id === productId);

  if (existingCartItem) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existingCartItem.quantity + 1 })
      .eq('id', existingCartItem.cartId);

    if (error) {
      console.error('Error updating cart:', error);
      return;
    }

    existingCartItem.quantity++;
  } else {
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        session_id: sessionId,
        product_id: productId,
        quantity: 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to cart:', error);
      return;
    }

    cart.push({
      cartId: data.id,
      product: product,
      quantity: 1
    });
  }

  updateCartUI();
  showCartBadgeAnimation();
}

function showCartBadgeAnimation() {
  const cartCount = document.getElementById('cartCount');
  cartCount.style.animation = 'none';
  setTimeout(() => {
    cartCount.style.animation = 'pulse 0.3s ease';
  }, 10);
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;

  renderCart();
}

function renderCart() {
  const cartBody = document.getElementById('cartBody');
  const totalAmount = document.getElementById('totalAmount');
  const checkoutTotal = document.getElementById('checkoutTotal');

  if (cart.length === 0) {
    cartBody.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    totalAmount.textContent = '$0.00';
    checkoutTotal.textContent = '$0.00';
    return;
  }

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

  cartBody.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.product.image_url}" alt="${item.product.name}" class="cart-item-image" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">$${parseFloat(item.product.price).toFixed(2)}</div>
        <div class="cart-item-controls">
          <button class="quantity-button" data-action="decrease" data-id="${item.cartId}">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-button" data-action="increase" data-id="${item.cartId}">+</button>
          <button class="remove-button" data-id="${item.cartId}">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  totalAmount.textContent = '$' + total.toFixed(2);
  checkoutTotal.textContent = '$' + total.toFixed(2);

  document.querySelectorAll('.quantity-button').forEach(btn => {
    btn.addEventListener('click', () => updateQuantity(btn.dataset.id, btn.dataset.action));
  });

  document.querySelectorAll('.remove-button').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

async function updateQuantity(cartId, action) {
  const cartItem = cart.find(item => item.cartId === cartId);
  if (!cartItem) return;

  const newQuantity = action === 'increase' ? cartItem.quantity + 1 : cartItem.quantity - 1;

  if (newQuantity <= 0) {
    await removeFromCart(cartId);
    return;
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', cartId);

  if (error) {
    console.error('Error updating quantity:', error);
    return;
  }

  cartItem.quantity = newQuantity;
  updateCartUI();
}

async function removeFromCart(cartId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartId);

  if (error) {
    console.error('Error removing from cart:', error);
    return;
  }

  cart = cart.filter(item => item.cartId !== cartId);
  updateCartUI();
}

function setupEventListeners() {
  const cartButton = document.getElementById('cartButton');
  const closeCart = document.getElementById('closeCart');
  const cartModal = document.getElementById('cartModal');
  const checkoutButton = document.getElementById('checkoutButton');
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckout = document.getElementById('closeCheckout');
  const checkoutForm = document.getElementById('checkoutForm');
  const successModal = document.getElementById('successModal');
  const continueButton = document.getElementById('continueButton');

  cartButton.addEventListener('click', () => {
    cartModal.classList.add('active');
  });

  closeCart.addEventListener('click', () => {
    cartModal.classList.remove('active');
  });

  cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
      cartModal.classList.remove('active');
    }
  });

  checkoutButton.addEventListener('click', () => {
    if (cart.length === 0) return;
    cartModal.classList.remove('active');
    checkoutModal.classList.add('active');
  });

  closeCheckout.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
  });

  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) {
      checkoutModal.classList.remove('active');
    }
  });

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await processOrder();
  });

  continueButton.addEventListener('click', () => {
    successModal.classList.remove('active');
  });

  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.classList.remove('active');
    }
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentCategory = link.dataset.category;
      renderProducts();
    });
  });
}

async function processOrder() {
  const customerName = document.getElementById('customerName').value;
  const customerEmail = document.getElementById('customerEmail').value;
  const customerAddress = document.getElementById('customerAddress').value;

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      session_id: sessionId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      total_amount: total,
      status: 'pending'
    })
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError);
    alert('Failed to place order. Please try again.');
    return;
  }

  const orderItems = cart.map(item => ({
    order_id: order.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price: item.product.price
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    alert('Failed to place order. Please try again.');
    return;
  }

  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    console.error('Error clearing cart:', deleteError);
  }

  cart = [];
  updateCartUI();

  document.getElementById('checkoutModal').classList.remove('active');
  document.getElementById('successModal').classList.add('active');

  document.getElementById('checkoutForm').reset();
}

init();
