import { sql } from "./neon-config.js";

let cart = [];
let allProducts = [];
let currentCategory = "semua";
let activeCashierName = "";
let modalPayMethod = 'CASH';
let modalTotal = 0;

let printerConfig = JSON.parse(localStorage.getItem('cfm_printer_cfg')) || {
  storeName: "CHICKEN FIRE MATARAM", storePhone: "0812-3456-7890", storeAddress: "Karanganyar - Jawa Tengah", storeFooter: "Terima Kasih!"
};

// === LOGIN KASIR ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  const errorMsg = document.getElementById('login-error');

  try {
    const rows = await sql`SELECT * FROM cashiers ORDER BY created_at DESC`;
    const match = rows.find(c => c.username === u && c.password === p);
    const isDefault = (u === 'kasir' && p === 'kasir123');

    if (match || isDefault) {
      activeCashierName = match ? match.name : "Kasir Siswa";
      document.getElementById('login-modal').classList.add('hidden');
      document.getElementById('current-user-display').innerText = activeCashierName;
      errorMsg.classList.add('hidden');
      loadProducts();
    } else errorMsg.classList.remove('hidden');
  } catch (err) {
    // Fallback jika DB error, izinkan default
    if (u === 'kasir' && p === 'kasir123') {
      activeCashierName = "Kasir Siswa";
      document.getElementById('login-modal').classList.add('hidden');
      document.getElementById('current-user-display').innerText = activeCashierName;
      loadProducts();
    } else errorMsg.classList.remove('hidden');
  }
});

// === LOAD PRODUK ===
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const rows = await sql`SELECT * FROM products ORDER BY id DESC`;
    allProducts = rows.map(p => ({
      id: p.id, name: p.name, category: p.category, price: parseFloat(p.price) || 0, discountType: p.discount_type, discountValue: parseFloat(p.discount_value) || 0, imageUrl: p.image_url
    }));
    renderProducts();
  } catch (err) { grid.innerHTML = '<p class="text-xs text-red-400 text-center col-span-4 py-10">Gagal memuat produk.</p>'; }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  const filtered = allProducts.filter(p => currentCategory === 'semua' || p.category === currentCategory);
  if (!filtered.length) return grid.innerHTML = '<p class="text-xs text-zinc-500 text-center col-span-4 py-10">Tidak ada produk.</p>';

  filtered.forEach(p => {
    let finalPrice = p.price;
    if (p.discountType === 'percent') finalPrice -= (p.price * (p.discountValue / 100));
    else if (p.discountType === 'nominal') finalPrice -= p.discountValue;
    
    const card = document.createElement('div');
    card.className = "product-card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-red-600 p-2 transition-all";
    card.innerHTML = `
      <img src="${p.imageUrl}" class="w-full h-20 object-cover rounded-lg mb-1.5">
      <h4 class="font-bold text-zinc-100 text-[11px] truncate">${p.name}</h4>
      <p class="text-red-500 font-black text-[11px]">Rp ${finalPrice.toLocaleString('id-ID')}</p>
    `;
    card.addEventListener('click', () => addToCart(p, finalPrice));
    grid.appendChild(card);
  });
}

// === KATEGORI ===
document.querySelectorAll('#cat-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-tabs button').forEach(b => b.className = "cat-btn bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold px-3 py-1 rounded-lg text-xs");
    btn.className = "cat-btn bg-red-600 text-white font-bold px-3 py-1 rounded-lg text-xs";
    currentCategory = btn.dataset.cat;
    renderProducts();
  });
});

// === CART ===
function addToCart(prod, finalPrice) {
  const existing = cart.find(i => i.id === prod.id);
  if (existing) existing.qty += 1;
  else cart.push({ ...prod, finalPrice, qty: 1, itemNote: "" });
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let total = 0;
  
  if (cart.length === 0) {
    container.innerHTML = '<p class="text-xs text-zinc-500 text-center py-6">Keranjang kosong</p>';
    document.getElementById('cart-total').innerText = 'Rp 0';
    return;
  }

  cart.forEach((item, index) => {
    const subtotal = item.finalPrice * item.qty;
    total += subtotal;
    const div = document.createElement('div');
    div.className = "bg-zinc-950 border border-zinc-800 p-2 rounded space-y-1 text-xs";
    div.innerHTML = `
      <div class="flex justify-between"><span class="font-bold text-zinc-100">${item.name}</span><span class="font-black text-red-500">Rp ${subtotal.toLocaleString('id-ID')}</span></div>
      <div class="flex items-center space-x-1.5">
        <button class="btn-minus w-5 h-5 bg-zinc-800 text-red-400 font-bold rounded" data-index="${index}">-</button>
        <span class="font-bold text-white text-[10px] w-4 text-center">${item.qty}</span>
        <button class="btn-plus w-5 h-5 bg-red-600 text-white font-bold rounded" data-index="${index}">+</button>
      </div>`;
    container.appendChild(div);
  });

  document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');

  container.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', () => { cart[b.dataset.index].qty--; if(cart[b.dataset.index].qty <= 0) cart.splice(b.dataset.index, 1); renderCart(); }));
  container.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', () => { cart[b.dataset.index].qty++; renderCart(); }));
}

document.getElementById('clear-cart-btn').addEventListener('click', () => { if(confirm("Hapus semua?")) { cart = []; renderCart(); } });

// === PEMBAYARAN ===
const payModal = document.getElementById('pay-modal');
const payModalAmount = document.getElementById('pay-modal-amount');

document.getElementById('open-pay-modal-btn').addEventListener('click', () => {
  if (cart.length === 0) return alert('Keranjang kosong!');
  modalTotal = cart.reduce((s, i) => s + (i.finalPrice * i.qty), 0);
  document.getElementById('pay-modal-total').innerText = 'Rp ' + modalTotal.toLocaleString('id-ID');
  payModalAmount.value = '';
  document.getElementById('pay-modal-change').innerText = 'Rp 0';
  payModal.classList.remove('hidden');
});

document.getElementById('close-pay-modal-btn').addEventListener('click', () => payModal.classList.add('hidden'));
payModalAmount.addEventListener('input', (e) => {
  const pay = parseFloat(e.target.value) || 0;
  const change = pay - modalTotal;
  document.getElementById('pay-modal-change').innerText = 'Rp ' + (change > 0 ? change.toLocaleString('id-ID') : '0');
});

window.setQuickCashModal = (amt) => {
  payModalAmount.value = amt === 0 ? modalTotal : amt;
  payModalAmount.dispatchEvent(new Event('input'));
};

// === SIMPAN TRANSAKSI ===
document.getElementById('pay-modal-confirm').addEventListener('click', async () => {
  const pay = parseFloat(payModalAmount.value) || 0;
  if (pay < modalTotal) return alert('Uang kurang!');
  const cust = document.getElementById('customer-select').value || "Pelanggan Umum";
  const tbl = document.getElementById('table-no').value || "-";
  
  try {
    await sql`INSERT INTO orders (cashier_name, customer_name, table_number, payment_method, status, total_amount, paid_amount, change_amount) 
              VALUES (${activeCashierName}, ${cust}, ${tbl}, 'CASH', 'COMPLETED', ${modalTotal}, ${pay}, ${pay - modalTotal})`;
    alert("Transaksi Berhasil!");
    cart = []; renderCart();
    payModal.classList.add('hidden');
  } catch (err) { alert("Gagal simpan ke DB."); }
});

// === PRINTER CONFIG ===
document.getElementById('open-printer-settings-btn').addEventListener('click', () => {
  document.getElementById('cfg-store-name').value = printerConfig.storeName;
  document.getElementById('cfg-store-phone').value = printerConfig.storePhone;
  document.getElementById('cfg-store-address').value = printerConfig.storeAddress;
  document.getElementById('cfg-store-footer').value = printerConfig.storeFooter;
  document.getElementById('printer-modal').classList.remove('hidden');
});
document.getElementById('close-printer-modal-btn').addEventListener('click', () => document.getElementById('printer-modal').classList.add('hidden'));
document.getElementById('save-printer-settings-btn').addEventListener('click', () => {
  printerConfig = {
    storeName: document.getElementById('cfg-store-name').value,
    storePhone: document.getElementById('cfg-store-phone').value,
    storeAddress: document.getElementById('cfg-store-address').value,
    storeFooter: document.getElementById('cfg-store-footer').value
  };
  localStorage.setItem('cfm_printer_cfg', JSON.stringify(printerConfig));
  alert("Tersimpan!"); document.getElementById('printer-modal').classList.add('hidden');
});
