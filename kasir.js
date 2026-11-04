import { sql } from "./neon-config.js";

let cart = [];
let allProducts = [];
let currentCategory = "semua";
let activeCashierName = "";
let modalTotal = 0;
let lastTransactionId = null;
let currentPayMethod = "CASH";

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
    if (u === 'kasir' && p === 'kasir123') {
      activeCashierName = "Kasir Siswa";
      document.getElementById('login-modal').classList.add('hidden');
      document.getElementById('current-user-display').innerText = activeCashierName;
      loadProducts();
    } else errorMsg.classList.remove('hidden');
  }
});

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const rows = await sql`SELECT * FROM products ORDER BY id DESC`;
    allProducts = rows.map(p => ({
      id: p.id, name: p.name, category: p.category, price: parseFloat(p.price) || 0, discountType: p.discount_type, discountValue: parseFloat(p.discount_value) || 0, imageUrl: p.image_url
    }));
    renderProducts();
  } catch (err) { grid.innerHTML = '<p class="text-sm text-red-400 text-center col-span-4 py-10">Gagal memuat produk.</p>'; }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  const filtered = allProducts.filter(p => currentCategory === 'semua' || p.category === currentCategory);
  if (!filtered.length) return grid.innerHTML = '<p class="text-sm text-zinc-500 text-center col-span-4 py-10">Tidak ada produk.</p>';

  filtered.forEach(p => {
    let finalPrice = p.price;
    if (p.discountType === 'percent') finalPrice -= (p.price * (p.discountValue / 100));
    else if (p.discountType === 'nominal') finalPrice -= p.discountValue;
    
    const card = document.createElement('div');
    card.className = "product-card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-red-600 p-3 transition-all";
    card.innerHTML = `
      <img src="${p.imageUrl}" class="w-full h-24 object-cover rounded-lg mb-2">
      <h4 class="font-bold text-zinc-100 text-sm truncate">${p.name}</h4>
      <p class="text-red-500 font-black text-sm mt-1">Rp ${finalPrice.toLocaleString('id-ID')}</p>
    `;
    card.addEventListener('click', () => addToCart(p, finalPrice));
    grid.appendChild(card);
  });
}

document.querySelectorAll('#cat-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-tabs button').forEach(b => b.className = "cat-btn bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold px-4 py-2 rounded-lg text-sm");
    btn.className = "cat-btn bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm";
    currentCategory = btn.dataset.cat;
    renderProducts();
  });
});

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
    container.innerHTML = '<p class="text-sm text-zinc-500 text-center py-6">Keranjang kosong</p>';
    document.getElementById('cart-total').innerText = 'Rp 0';
    return;
  }

  cart.forEach((item, index) => {
    const subtotal = item.finalPrice * item.qty;
    total += subtotal;
    const div = document.createElement('div');
    div.className = "bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2 text-sm";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-zinc-100">${item.name}</span>
        <span class="font-black text-red-500">Rp ${subtotal.toLocaleString('id-ID')}</span>
      </div>
      <div class="flex items-center space-x-2">
        <button class="btn-minus w-7 h-7 bg-zinc-800 text-red-400 font-bold rounded-lg" data-index="${index}">-</button>
        <span class="font-bold text-white text-sm w-6 text-center">${item.qty}</span>
        <button class="btn-plus w-7 h-7 bg-red-600 text-white font-bold rounded-lg" data-index="${index}">+</button>
      </div>
      <input type="text" placeholder="Catatan (cth: Pedas, Tanpa Es)..." value="${item.itemNote || ''}" data-index="${index}" class="note-input w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-amber-300 focus:outline-none focus:border-amber-600">
    `;
    container.appendChild(div);
  });

  document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');

  container.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', () => { cart[b.dataset.index].qty--; if(cart[b.dataset.index].qty <= 0) cart.splice(b.dataset.index, 1); renderCart(); }));
  container.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', () => { cart[b.dataset.index].qty++; renderCart(); }));
  container.querySelectorAll('.note-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (cart[idx]) cart[idx].itemNote = e.target.value;
    });
  });
}

document.getElementById('clear-cart-btn').addEventListener('click', () => { if(confirm("Hapus semua?")) { cart = []; renderCart(); } });

const payModal = document.getElementById('pay-modal');
const payModalAmount = document.getElementById('pay-modal-amount');
const printModal = document.getElementById('print-modal');

function setPayMethod(method) {
  currentPayMethod = method;
  const btnCash = document.getElementById('pay-modal-cash');
  const btnQris = document.getElementById('pay-modal-qris');
  const cashGroup = document.getElementById('pay-modal-cash-group');

  if (method === 'CASH') {
    btnCash.className = "py-3 rounded-xl border font-bold border-red-600 bg-red-600 text-white transition-colors";
    btnQris.className = "py-3 rounded-xl border font-bold border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors";
    cashGroup.classList.remove('opacity-40', 'pointer-events-none');
    payModalAmount.value = '';
    payModalAmount.dispatchEvent(new Event('input'));
  } else {
    btnQris.className = "py-3 rounded-xl border font-bold border-blue-600 bg-blue-600 text-white transition-colors";
    btnCash.className = "py-3 rounded-xl border font-bold border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors";
    cashGroup.classList.add('opacity-40', 'pointer-events-none');
    payModalAmount.value = modalTotal;
    payModalAmount.dispatchEvent(new Event('input'));
  }
}

document.getElementById('pay-modal-cash').addEventListener('click', () => setPayMethod('CASH'));
document.getElementById('pay-modal-qris').addEventListener('click', () => setPayMethod('QRIS'));

document.getElementById('open-pay-modal-btn').addEventListener('click', () => {
  if (cart.length === 0) return alert('Keranjang kosong!');
  modalTotal = cart.reduce((s, i) => s + (i.finalPrice * i.qty), 0);
  document.getElementById('pay-modal-total').innerText = 'Rp ' + modalTotal.toLocaleString('id-ID');
  setPayMethod('CASH');
  payModal.classList.remove('hidden');
});

document.getElementById('close-pay-modal-btn').addEventListener('click', () => payModal.classList.add('hidden'));
payModalAmount.addEventListener('input', (e) => {
  const pay = parseFloat(e.target.value) || 0;
  const change = pay - modalTotal;
  document.getElementById('pay-modal-change').innerText = 'Rp ' + (change > 0 ? change.toLocaleString('id-ID') : '0');
});

window.setQuickCash = (amt) => {
  if(currentPayMethod !== 'CASH') return;
  payModalAmount.value = amt === 0 ? modalTotal : amt;
  payModalAmount.dispatchEvent(new Event('input'));
};

// ==========================================
// PERBAIKAN: MEMISAHKAN SIMPAN DB DAN CETAK
// ==========================================
document.getElementById('pay-modal-confirm').addEventListener('click', async () => {
  const pay = currentPayMethod === 'QRIS' ? modalTotal : (parseFloat(payModalAmount.value) || 0);
  if (pay < modalTotal) return alert('Uang kurang!');
  const cust = document.getElementById('customer-select').value || "Pelanggan Umum";
  const tbl = document.getElementById('table-no').value || "-";
  
  try {
    const [newOrder] = await sql`INSERT INTO orders (cashier_name, customer_name, table_number, payment_method, status, total_amount, paid_amount, change_amount) 
              VALUES (${activeCashierName}, ${cust}, ${tbl}, ${currentPayMethod}, 'COMPLETED', ${modalTotal}, ${pay}, ${pay - modalTotal})
              RETURNING id`;
    
    lastTransactionId = newOrder.id;

    for (const item of cart) {
      await sql`INSERT INTO order_items (order_id, product_name, qty, price, discount_amount, item_note, category) 
                VALUES (${lastTransactionId}, ${item.name}, ${item.qty}, ${item.finalPrice}, 0, ${item.itemNote || ''}, ${item.category})`;
    }

    // Jika berhasil simpan, TUTUP modal bayar, BUKA modal cetak.
    payModal.classList.add('hidden');
    printModal.classList.remove('hidden');
    
  } catch (err) { 
    console.error("Error Database:", err);
    alert("Gagal simpan ke DB. Cek koneksi internet atau konsol browser."); 
  }
});

// ==========================================
// PERBAIKAN: FUNGSI CETAK ANTI-ERROR
// ==========================================
function printReceipt(type) {
  const cust = document.getElementById('customer-select').value || "Pelanggan Umum";
  const tbl = document.getElementById('table-no').value || "-";
  const now = new Date().toLocaleString('id-ID');
  
  let printText = `CHICKEN FIRE MATARAM\n`;
  printText += `--- ${type === 'kitchen' ? 'SLIP DAPUR (MAKANAN)' : 'SLIP BAR (MINUMAN)'} ---\n`;
  printText += `ID: #${lastTransactionId}\nWaktu: ${now}\nKasir: ${activeCashierName}\nCust: ${cust} (${tbl})\n`;
  printText += `--------------------------------\n`;

  const filteredItems = cart.filter(i => type === 'kitchen' ? (i.category === 'makanan' || i.category === 'paket') : (i.category === 'minuman' || i.category === 'paket'));

  if (filteredItems.length === 0) {
    alert(`Tidak ada pesanan untuk kategori ${type === 'kitchen' ? 'Dapur' : 'Bar'}.`);
    return;
  }

  filteredItems.forEach(i => {
    printText += `${i.qty}x ${i.name}\n`;
    if(i.itemNote) printText += `   *Catatan: ${i.itemNote}\n`;
  });
  printText += `--------------------------------\n\n\n`;

  // Coba jalankan RawBT, jika error di PC/Web, tangkap error agar tidak merusak UI.
  try {
    window.location.href = "intent:" + encodeURIComponent(printText) + "#Intent;scheme=rawbt;package=ru.a404m.rawbt;end;";
  } catch (e) {
    console.warn("RawBT intent gagal dieksekusi (Mungkin bukan di Android).", e);
    alert("Struk berhasil diproses, tapi aplikasi RawBT tidak ditemukan di perangkat ini.");
  }
}

document.getElementById('print-kitchen-btn').addEventListener('click', () => printReceipt('kitchen'));
document.getElementById('print-drink-btn').addEventListener('click', () => printReceipt('drink'));

document.getElementById('close-print-modal-btn').addEventListener('click', () => {
  cart = []; 
  renderCart();
  printModal.classList.add('hidden');
  document.getElementById('table-no').value = '';
  document.getElementById('customer-select').value = 'Pelanggan Umum';
});
