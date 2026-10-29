import { sql } from "./neon-config.js";

let cart = [];
let lastSavedCart = [];
let lastSavedCustomer = "Pelanggan Umum";
let lastSavedTable = "-";

let allProducts = [];
let allCashiers = [];
let currentPayMethod = "CASH";
let currentCategory = "semua";
let activeCashierName = "";
let adminMasterPassword = "1234";

// KONFIGURASI PRINTER DEFAULT (SAVED IN LOCALSTORAGE)
let printerConfig = JSON.parse(localStorage.getItem('cfm_printer_cfg')) || {
  storeName: "CHICKEN FIRE MATARAM",
  storePhone: "0812-3456-7890",
  storeAddress: "Karanganyar - Jawa Tengah",
  storeFooter: "Terima Kasih Atas Kunjungan Anda! Nikmati Pedasnya Chicken Fire!",
  taxPercent: 0,
  custPaper: "58mm",
  custCopies: 1,
  kitchenPaper: "58mm",
  kitchenCopies: 1
};

// 1. MODAL PENGATURAN PRINTER
document.getElementById('open-printer-settings-btn').addEventListener('click', () => {
  document.getElementById('cfg-store-name').value = printerConfig.storeName;
  document.getElementById('cfg-store-phone').value = printerConfig.storePhone;
  document.getElementById('cfg-store-address').value = printerConfig.storeAddress;
  document.getElementById('cfg-store-footer').value = printerConfig.storeFooter;
  document.getElementById('cfg-tax-percent').value = printerConfig.taxPercent;
  document.getElementById('cfg-cust-paper').value = printerConfig.custPaper;
  document.getElementById('cfg-cust-copies').value = printerConfig.custCopies;
  document.getElementById('cfg-kitchen-paper').value = printerConfig.kitchenPaper;
  document.getElementById('cfg-kitchen-copies').value = printerConfig.kitchenCopies;

  document.getElementById('printer-modal').classList.remove('hidden');
});

document.getElementById('close-printer-modal-btn').addEventListener('click', () => {
  document.getElementById('printer-modal').classList.add('hidden');
});

document.getElementById('save-printer-settings-btn').addEventListener('click', () => {
  printerConfig = {
    storeName: document.getElementById('cfg-store-name').value,
    storePhone: document.getElementById('cfg-store-phone').value,
    storeAddress: document.getElementById('cfg-store-address').value,
    storeFooter: document.getElementById('cfg-store-footer').value,
    taxPercent: parseFloat(document.getElementById('cfg-tax-percent').value) || 0,
    custPaper: document.getElementById('cfg-cust-paper').value,
    custCopies: parseInt(document.getElementById('cfg-cust-copies').value) || 1,
    kitchenPaper: document.getElementById('cfg-kitchen-paper').value,
    kitchenCopies: parseInt(document.getElementById('cfg-kitchen-copies').value) || 1
  };

  localStorage.setItem('cfm_printer_cfg', JSON.stringify(printerConfig));
  alert("Pengaturan Printer & Struk Berhasil Disimpan!");
  document.getElementById('printer-modal').classList.add('hidden');
});

// 2. TES PRINTER
window.testPrint = (type) => {
  const dummyCart = [
    { name: "Ayam Fire Level 3", qty: 2, finalPrice: 20000, discAmount: 0, itemNote: "Ekstra Pedas" },
    { name: "Es Teh Manis", qty: 2, finalPrice: 5000, discAmount: 0, itemNote: "Manis Sedang" }
  ];
  executePrint(type, "TES PRINTER", "Pelanggan Tes", "Meja 01", dummyCart, 50000, 50000, 0, "CASH");
};

// 3. LOGIN & KASIR SYSTEM
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const role = document.getElementById('login-role').value;
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();

  const adminView = document.getElementById('admin-view');
  const kasirView = document.getElementById('kasir-view');
  const userDisplay = document.getElementById('current-user-display');
  const errorMsg = document.getElementById('login-error');

  if (role === 'admin') {
    if (u === 'admin' && p === adminMasterPassword) {
      document.getElementById('login-modal').classList.add('hidden');
      adminView.classList.remove('hidden');
      kasirView.classList.add('hidden');
      userDisplay.innerText = "Admin System";
      errorMsg.classList.add('hidden');
      loadAdminProducts();
      loadCashiers();
    } else {
      errorMsg.classList.remove('hidden');
    }
  } else if (role === 'kasir') {
    await loadCashiers();
    const cashierMatch = allCashiers.find(c => c.username === u && c.password === p);
    if (cashierMatch || (u === 'kasir' && p === 'kasir123')) {
      activeCashierName = cashierMatch ? cashierMatch.name : "Kasir Siswa";
      document.getElementById('login-modal').classList.add('hidden');
      kasirView.classList.remove('hidden');
      adminView.classList.add('hidden');
      userDisplay.innerText = activeCashierName;
      errorMsg.classList.add('hidden');
      loadProducts();
    } else {
      errorMsg.classList.remove('hidden');
    }
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-form').reset();
  cart = [];
  lastSavedCart = [];
  renderCart();
});

// KELOLA KASIR SISWA
document.getElementById('add-cashier-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cashier-name-input').value.trim();
  const username = document.getElementById('cashier-user-input').value.trim();
  const password = document.getElementById('cashier-pass-input').value.trim();

  try {
    await sql`INSERT INTO cashiers (name, username, password) VALUES (${name}, ${username}, ${password})`;
    alert("Kasir berhasil ditambahkan!");
    document.getElementById('add-cashier-form').reset();
    loadCashiers();
  } catch (err) { alert("Username sudah digunakan!"); }
});

async function loadCashiers() {
  const container = document.getElementById('cashier-list-admin');
  if(!container) return;
  container.innerHTML = '';
  try {
    const rows = await sql`SELECT * FROM cashiers ORDER BY created_at DESC`;
    allCashiers = rows;
    rows.forEach((c) => {
      container.innerHTML += `
        <div class="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-1.5 rounded text-xs">
          <div><span class="font-bold text-zinc-200">${c.name}</span> <span class="text-[9px] text-zinc-500">(${c.username})</span></div>
          <button onclick="removeCashier(${c.id})" class="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[9px]">Hapus</button>
        </div>`;
    });
  } catch (err) {}
}

window.removeCashier = async (id) => {
  if(confirm("Hapus akun kasir ini?")) {
    await sql`DELETE FROM cashiers WHERE id = ${id}`;
    loadCashiers();
  }
};

// UPLOAD MENU & KOMPRESI GAMBAR
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  btn.innerText = "Memproses...";
  btn.disabled = true;

  try {
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const discountType = document.getElementById('prod-discount-type').value;
    const discountValue = parseFloat(document.getElementById('prod-discount-value').value) || 0;
    const file = document.getElementById('prod-image-file').files[0];

    let imageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";
    if (file) imageUrl = await compressAndReadImage(file);

    await sql`
      INSERT INTO products (name, category, price, discount_type, discount_value, image_url)
      VALUES (${name}, ${category}, ${price}, ${discountType}, ${discountValue}, ${imageUrl})
    `;

    alert("Menu berhasil disimpan!");
    document.getElementById('add-product-form').reset();
    loadAdminProducts();
  } catch (err) { alert("Gagal menyimpan menu."); }
  finally { btn.innerText = "Simpan & Upload Menu"; btn.disabled = false; }
});

function compressAndReadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 300;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-menu-list');
  if(!container) return;
  try {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    container.innerHTML = '';
    rows.forEach((p) => {
      container.innerHTML += `
        <div class="flex items-center justify-between border border-zinc-800 p-2 rounded bg-zinc-950 text-xs">
          <div class="flex items-center space-x-2">
            <img src="${p.image_url}" class="w-10 h-10 object-cover rounded">
            <div><h5 class="font-bold text-zinc-200">${p.name}</h5><p class="text-zinc-400 text-[10px]">Rp ${parseFloat(p.price).toLocaleString('id-ID')}</p></div>
          </div>
          <button onclick="deleteProduct(${p.id})" class="bg-red-950 text-red-400 border border-red-800 px-2 py-1 rounded text-[10px]">Delete</button>
        </div>`;
    });
  } catch(err) {}
}

window.deleteProduct = async (id) => {
  if(confirm("Hapus menu ini?")) {
    await sql`DELETE FROM products WHERE id = ${id}`;
    loadAdminProducts();
  }
};

// KATALOG & KERANJANG KASIR
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if(!grid) return;
  try {
    const rows = await sql`SELECT * FROM products ORDER BY id DESC`;
    allProducts = rows.map(p => ({
      id: p.id, name: p.name, category: p.category, price: parseFloat(p.price),
      discountType: p.discount_type, discountValue: parseFloat(p.discount_value), imageUrl: p.image_url
    }));
    renderProducts();
  } catch (err) {}
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const filtered = allProducts.filter(p => currentCategory === 'semua' || p.category === currentCategory);
  filtered.forEach(p => {
    let finalPrice = p.price;
    if (p.discountType === 'percent') finalPrice = p.price - (p.price * (p.discountValue / 100));
    else if (p.discountType === 'nominal') finalPrice = p.price - p.discountValue;

    grid.innerHTML += `
      <div class="product-card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-red-600 p-2" data-id="${p.id}">
        <img src="${p.imageUrl}" class="w-full h-20 object-cover rounded-lg mb-1.5">
        <h4 class="font-bold text-zinc-100 text-[11px] truncate">${p.name}</h4>
        <p class="text-red-500 font-black text-[11px]">Rp ${finalPrice.toLocaleString('id-ID')}</p>
      </div>`;
  });

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const prod = allProducts.find(p => p.id == card.dataset.id);
      if(prod) addToCart(prod);
    });
  });
}

function addToCart(prod) {
  let finalPrice = prod.price;
  let discAmount = 0;
  if (prod.discountType === 'percent') { discAmount = prod.price * (prod.discountValue / 100); finalPrice = prod.price - discAmount; }
  else if (prod.discountType === 'nominal') { discAmount = prod.discountValue; finalPrice = prod.price - discAmount; }

  const existing = cart.find(i => i.id === prod.id);
  if(existing) existing.qty += 1;
  else cart.push({ ...prod, finalPrice, discAmount, qty: 1, itemNote: "" });
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  let total = 0;

  if(cart.length === 0) {
    container.innerHTML = '<p class="text-xs text-zinc-500 text-center py-6">Keranjang kosong</p>';
    document.getElementById('cart-total').innerText = 'Rp 0';
    calcChange();
    return;
  }

  cart.forEach((item, index) => {
    const subtotal = item.finalPrice * item.qty;
    total += subtotal;

    container.innerHTML += `
      <div class="bg-zinc-950 border border-zinc-800 p-2 rounded space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="font-bold text-zinc-100 truncate">${item.name}</span>
          <span class="font-black text-red-500">Rp ${subtotal.toLocaleString('id-ID')}</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <button class="btn-minus w-4 h-4 bg-zinc-800 text-red-400 font-bold rounded" data-index="${index}">-</button>
          <span class="font-bold text-white text-[10px]">${item.qty}</span>
          <button class="btn-plus w-4 h-4 bg-red-600 text-white font-bold rounded" data-index="${index}">+</button>
          <input type="text" placeholder="Catatan..." value="${item.itemNote || ''}" onchange="updateItemNote(${index}, this.value)" class="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 text-[10px] text-amber-200">
        </div>
      </div>`;
  });

  document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');
  document.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, -1)));
  document.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, 1)));
  calcChange();
}

window.updateItemNote = (idx, val) => { if (cart[idx]) cart[idx].itemNote = val.trim(); };
function updateQty(idx, change) { cart[idx].qty += change; if(cart[idx].qty <= 0) cart.splice(idx, 1); renderCart(); }

document.getElementById('btn-pay-cash').addEventListener('click', () => setPaymentMethod('CASH'));
document.getElementById('btn-pay-qris').addEventListener('click', () => setPaymentMethod('QRIS'));

function setPaymentMethod(m) {
  currentPayMethod = m;
  document.getElementById('btn-pay-cash').className = m === 'CASH' ? "py-1 rounded border text-xs font-bold border-red-600 bg-red-600 text-white" : "py-1 rounded border text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-400";
  document.getElementById('btn-pay-qris').className = m === 'QRIS' ? "py-1 rounded border text-xs font-bold border-blue-600 bg-blue-600 text-white" : "py-1 rounded border text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-400";
}

document.getElementById('pay-amount').addEventListener('input', calcChange);
function calcChange() {
  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const pay = parseFloat(document.getElementById('pay-amount').value) || 0;
  const change = pay - total;
  document.getElementById('change-amount').innerText = 'Rp ' + (change > 0 ? change.toLocaleString('id-ID') : '0');
}

// 4. SIMPAN TRANSAKSI & CETAK STRUK KE THERMAL PRINTER
document.getElementById('process-order-btn').addEventListener('click', async () => {
  if(cart.length === 0) return alert('Pilih pesanan terlebih dahulu!');

  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const pay = currentPayMethod === 'QRIS' ? total : (parseFloat(document.getElementById('pay-amount').value) || 0);
  if(currentPayMethod === 'CASH' && pay < total) return alert('Uang pembayaran kurang!');

  const customerName = document.getElementById('customer-select').value || "Pelanggan Umum";
  const tableNumber = document.getElementById('table-no').value || "-";

  try {
    const [newOrder] = await sql`
      INSERT INTO orders (cashier_name, customer_name, table_number, payment_method, status, total_amount, paid_amount, change_amount)
      VALUES (${activeCashierName || "Kasir Siswa"}, ${customerName}, ${tableNumber}, ${currentPayMethod}, 'COMPLETED', ${total}, ${pay}, ${pay - total})
      RETURNING id
    `;

    for (const item of cart) {
      await sql`
        INSERT INTO order_items (order_id, product_name, qty, price, discount_amount, item_note)
        VALUES (${newOrder.id}, ${item.name}, ${item.qty}, ${item.finalPrice}, ${item.discAmount}, ${item.itemNote || ''})
      `;
    }

    lastSavedCart = [...cart];
    lastSavedCustomer = customerName;
    lastSavedTable = tableNumber;

    // CETAK DIRECT STRUK CUSTOMER DENGAN PENGATURAN THERMAL
    executePrint('customer', newOrder.id, customerName, tableNumber, lastSavedCart, total, pay, pay - total, currentPayMethod);

    cart = [];
    document.getElementById('pay-amount').value = '';
    renderCart();
  } catch (err) {
    console.error(err);
    alert("Gagal menyimpan transaksi ke Neon DB.");
  }
});

document.getElementById('print-kitchen-btn').addEventListener('click', () => {
  let items = cart.length > 0 ? cart : lastSavedCart;
  let cust = cart.length > 0 ? (document.getElementById('customer-select').value || "Pelanggan Umum") : lastSavedCustomer;
  let tbl = cart.length > 0 ? (document.getElementById('table-no').value || '-') : lastSavedTable;
  if(items.length === 0) return alert("Tidak ada item pesanan!");
  executePrint('kitchen', "SLIP DAPUR", cust, tbl, items, 0, 0, 0, currentPayMethod);
});

document.getElementById('print-drink-btn').addEventListener('click', () => {
  let items = cart.length > 0 ? cart : lastSavedCart;
  let cust = cart.length > 0 ? (document.getElementById('customer-select').value || "Pelanggan Umum") : lastSavedCustomer;
  let tbl = cart.length > 0 ? (document.getElementById('table-no').value || '-') : lastSavedTable;
  if(items.length === 0) return alert("Tidak ada item pesanan!");
  executePrint('drink', "SLIP BAR", cust, tbl, items, 0, 0, 0, currentPayMethod);
});

// FUNGSI EKSEKUSI CETAK THERMAL PRINTER (TETAP RAPI DI KERTAS 58MM/80MM)
function executePrint(type, orderId, customer, table, itemsList, total, pay, change, payMethod) {
  const container = document.getElementById('printable-receipt');
  if(!container) return;

  const isCust = type === 'customer';
  let filteredItems = itemsList;

  if(type === 'kitchen') filteredItems = itemsList.filter(i => i.category === 'makanan' || i.category === 'paket');
  if(type === 'drink') filteredItems = itemsList.filter(i => i.category === 'minuman' || i.category === 'paket');

  if(filteredItems.length === 0) return alert(`Tidak ada menu untuk kategori ${type === 'kitchen' ? 'Dapur' : 'Bar'}.`);

  let subtotalCalc = 0;
  let itemRowsHTML = '';

  filteredItems.forEach(i => {
    const itemSub = i.finalPrice * i.qty;
    subtotalCalc += itemSub;
    itemRowsHTML += `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span style="font-weight:bold;">${i.name} x${i.qty}</span>
        ${isCust ? `<span>Rp ${itemSub.toLocaleString('id-ID')}</span>` : ''}
      </div>
      ${i.itemNote ? `<div style="font-size:10px; padding-left:8px;">*Req: ${i.itemNote}</div>` : ''}
    `;
  });

  const taxAmount = isCust ? (subtotalCalc * (printerConfig.taxPercent / 100)) : 0;
  const finalTotal = isCust ? (subtotalCalc + taxAmount) : 0;

  let now = new Date();
  let timeStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');

  container.innerHTML = `
    <div style="width: ${printerConfig.custPaper === '80mm' ? '78mm' : '56mm'}; font-size:11px; font-family:monospace; line-height:1.2;">
      <div style="text-align:center; font-weight:bold; font-size:13px;">${printerConfig.storeName}</div>
      <div style="text-align:center; font-size:9px;">${printerConfig.storeAddress}</div>
      <div style="text-align:center; font-size:9px;">Telp: ${printerConfig.storePhone}</div>
      <div style="border-bottom:1px dashed #000; margin:4px 0;"></div>
      
      <div><b>${isCust ? 'STRUK PEMBAYARAN' : (type === 'kitchen' ? 'SLIP DAPUR' : 'SLIP BAR')}</b></div>
      <div>No: #${orderId}</div>
      <div>Waktu: ${timeStr}</div>
      <div>Kasir: ${activeCashierName || "Kasir"}</div>
      <div>Cust: ${customer} (${table})</div>
      <div>Metode: ${payMethod}</div>
      <div style="border-bottom:1px dashed #000; margin:4px 0;"></div>

      ${itemRowsHTML}

      <div style="border-bottom:1px dashed #000; margin:4px 0;"></div>

      ${isCust ? `
        <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>Rp ${subtotalCalc.toLocaleString('id-ID')}</span></div>
        ${printerConfig.taxPercent > 0 ? `<div style="display:flex; justify-content:space-between;"><span>PPN (${printerConfig.taxPercent}%):</span><span>Rp ${taxAmount.toLocaleString('id-ID')}</span></div>` : ''}
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px; margin-top:2px;">
          <span>TOTAL:</span><span>Rp ${finalTotal.toLocaleString('id-ID')}</span>
        </div>
        <div style="display:flex; justify-content:space-between;"><span>Bayar:</span><span>Rp ${pay.toLocaleString('id-ID')}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Kembali:</span><span>Rp ${change.toLocaleString('id-ID')}</span></div>
        <div style="border-bottom:1px dashed #000; margin:4px 0;"></div>
        <div style="text-align:center; font-size:9px; margin-top:6px;">${printerConfig.storeFooter}</div>
      ` : `
        <div style="text-align:center; font-weight:bold; margin-top:4px;">--- SEGERA DIPROSES ---</div>
      `}
    </div>
  `;

  // TRIGGER PERINTAH CETAK PRINTER TABLET
  window.print();
}

loadCashiers();
