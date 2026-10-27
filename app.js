import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let cart = [];
let allProducts = [];
let currentPayMethod = "CASH";
let currentCategory = "semua";

// 1. LOGIN ADMIN
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  if(u === 'admin' && p === '1234') {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('current-user-display').innerText = u;
    document.getElementById('login-error').classList.add('hidden');
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  document.getElementById('login-modal').classList.remove('hidden');
});

document.getElementById('open-admin-btn').addEventListener('click', () => {
  document.getElementById('admin-modal').classList.remove('hidden');
});
document.getElementById('close-admin-btn').addEventListener('click', () => {
  document.getElementById('admin-modal').classList.add('hidden');
});

// 2. AUTO UPLOAD FOTO KE IMGUR & SIMPAN KE FIRESTORE
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  btn.innerText = "Mengunggah Foto...";
  btn.disabled = true;

  try {
    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const fileInput = document.getElementById('prod-image-file');
    const file = fileInput.files[0];

    // Upload ke Imgur API secara publik
    const formData = new FormData();
    formData.append("image", file);

    const imgurResponse = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: "Client-ID c982d61d56223b2"
      },
      body: formData
    });

    const imgurData = await imgurResponse.json();

    if (!imgurData.success) {
      throw new Error("Gagal mengunggah gambar ke Imgur");
    }

    const imageUrl = imgurData.data.link;
    btn.innerText = "Menyimpan ke Database...";

    await addDoc(collection(db, "products"), {
      name,
      category,
      price,
      imageUrl,
      createdAt: serverTimestamp()
    });

    alert("Menu berhasil ditambahkan!");
    document.getElementById('add-product-form').reset();
    document.getElementById('admin-modal').classList.add('hidden');
    loadProducts();
  } catch (err) {
    console.error("Gagal menambah menu:", err);
    alert("Terjadi kesalahan saat mengunggah menu.");
  } finally {
    btn.innerText = "Simpan & Upload Menu";
    btn.disabled = false;
  }
});

// 3. LOAD MENU DARI DATABASE
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<p class="text-xs text-gray-400 col-span-4 text-center py-10">Memuat menu...</p>';
  
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    allProducts = [];
    querySnapshot.forEach((doc) => {
      allProducts.push({ id: doc.id, ...doc.data() });
    });
    renderProducts();
  } catch (err) {
    console.error("Error loading products:", err);
    grid.innerHTML = '<p class="text-xs text-red-500 col-span-4 text-center py-10">Gagal memuat produk!</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const searchVal = document.getElementById('search-product').value.toLowerCase();
  grid.innerHTML = '';

  const filtered = allProducts.filter(p => {
    const matchCat = currentCategory === 'semua' || p.category === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(searchVal);
    return matchCat && matchSearch;
  });

  if(filtered.length === 0) {
    grid.innerHTML = '<p class="text-xs text-gray-400 col-span-4 text-center py-10">Belum ada menu.</p>';
    return;
  }

  filtered.forEach(p => {
    const badgeColor = p.category === 'makanan' ? 'bg-red-100 text-red-600' : p.category === 'minuman' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-700';
    grid.innerHTML += `
      <div class="product-card bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm hover:border-red-500 hover:shadow-md cursor-pointer transition" data-id="${p.id}">
        <img src="${p.imageUrl}" class="w-full h-24 object-cover" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'">
        <div class="p-2">
          <span class="text-[10px] ${badgeColor} font-bold px-1.5 py-0.5 rounded capitalize">${p.category}</span>
          <h4 class="font-bold text-gray-800 text-xs mt-1 truncate">${p.name}</h4>
          <p class="text-merah-id font-black text-xs">Rp ${p.price.toLocaleString('id-ID')}</p>
        </div>
      </div>
    `;
  });

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const prod = allProducts.find(p => p.id === card.dataset.id);
      if(prod) addToCart(prod);
    });
  });
}

document.getElementById('search-product').addEventListener('input', renderProducts);

document.querySelectorAll('#cat-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-tabs button').forEach(b => {
      b.className = "cat-btn bg-gray-100 text-gray-700 font-bold px-4 py-1.5 rounded-t-lg text-xs hover:bg-red-50";
    });
    btn.className = "cat-btn bg-merah-id text-white font-bold px-4 py-1.5 rounded-t-lg text-xs";
    currentCategory = btn.dataset.cat;
    renderProducts();
  });
});

// 4. KERANJANG & METODE BAYAR
function addToCart(prod) {
  const existing = cart.find(i => i.id === prod.id);
  if(existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    container.innerHTML += `
      <div class="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
        <div class="w-1/2">
          <div class="font-bold text-gray-800 truncate">${item.name}</div>
          <div class="text-gray-400 text-[10px]">Rp ${item.price.toLocaleString('id-ID')}</div>
        </div>
        <div class="flex items-center space-x-1">
          <button class="btn-minus w-5 h-5 bg-gray-200 text-gray-700 font-bold rounded" data-index="${index}">-</button>
          <span class="font-bold w-4 text-center">${item.qty}</span>
          <button class="btn-plus w-5 h-5 bg-red-600 text-white font-bold rounded" data-index="${index}">+</button>
        </div>
        <div class="font-bold text-merah-id w-16 text-right">Rp ${subtotal.toLocaleString('id-ID')}</div>
      </div>
    `;
  });

  document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');
  
  document.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, -1)));
  document.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, 1)));
  
  calcChange();
}

function updateQty(idx, change) {
  cart[idx].qty += change;
  if(cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}

document.getElementById('clear-cart-btn').addEventListener('click', () => {
  cart = [];
  renderCart();
});

document.getElementById('btn-pay-cash').addEventListener('click', () => setPaymentMethod('CASH'));
document.getElementById('btn-pay-qris').addEventListener('click', () => setPaymentMethod('QRIS'));

function setPaymentMethod(m) {
  currentPayMethod = m;
  const btnC = document.getElementById('btn-pay-cash');
  const btnQ = document.getElementById('btn-pay-qris');
  const cashGroup = document.getElementById('cash-input-group');

  if(m === 'CASH') {
    btnC.className = "py-1.5 rounded-md border text-xs font-bold border-red-600 bg-red-600 text-white";
    btnQ.className = "py-1.5 rounded-md border text-xs font-bold border-gray-300 bg-gray-100 text-gray-700";
    cashGroup.classList.remove('hidden');
  } else {
    btnQ.className = "py-1.5 rounded-md border text-xs font-bold border-red-600 bg-red-600 text-white";
    btnC.className = "py-1.5 rounded-md border text-xs font-bold border-gray-300 bg-gray-100 text-gray-700";
    cashGroup.classList.add('hidden');
  }
}

document.getElementById('pay-amount').addEventListener('input', calcChange);

function calcChange() {
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const pay = parseFloat(document.getElementById('pay-amount').value) || 0;
  const change = pay - total;
  document.getElementById('change-amount').innerText = 'Rp ' + (change > 0 ? change.toLocaleString('id-ID') : '0');
}

// 5. SIMPAN TRANSAKSI
document.getElementById('process-order-btn').addEventListener('click', async () => {
  if(cart.length === 0) return alert('Pilih pesanan terlebih dahulu!');

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const pay = currentPayMethod === 'QRIS' ? total : (parseFloat(document.getElementById('pay-amount').value) || 0);
  if(currentPayMethod === 'CASH' && pay < total) return alert('Uang pembayaran kurang!');

  try {
    await addDoc(collection(db, "orders"), {
      customerName: document.getElementById('customer-select').value,
      tableNumber: document.getElementById('table-no').value || "-",
      paymentMethod: currentPayMethod,
      items: cart,
      totalAmount: total,
      paidAmount: pay,
      changeAmount: pay - total,
      createdAt: serverTimestamp()
    });

    alert("Transaksi Berhasil Disimpan!");
    cart = [];
    document.getElementById('pay-amount').value = '';
    renderCart();
  } catch (err) {
    console.error("Gagal simpan transaksi:", err);
    alert("Terjadi kesalahan saat menyimpan transaksi.");
  }
});

// 6. STRUK & EXCEL
document.getElementById('print-kasir-btn').addEventListener('click', () => printReceipt('kasir'));
document.getElementById('print-kitchen-btn').addEventListener('click', () => printReceipt('kitchen'));
document.getElementById('print-drink-btn').addEventListener('click', () => printReceipt('drink'));

function printReceipt(type) {
  if(cart.length === 0) return alert('Keranjang belanja masih kosong!');
  const customer = document.getElementById('customer-select').value;
  const table = document.getElementById('table-no').value || '-';

  let receiptTitle = "";
  let itemsToPrint = cart;

  if(type === 'kasir') {
    receiptTitle = "=== STRUK BUKTI PEMBELIAN ===";
  } else if(type === 'kitchen') {
    receiptTitle = "=== STRUK DAPUR (KITCHEN) ===";
    itemsToPrint = cart.filter(i => i.category === 'makanan' || i.category === 'paket');
  } else if(type === 'drink') {
    receiptTitle = "=== STRUK BAR (DRINK) ===";
    itemsToPrint = cart.filter(i => i.category === 'minuman' || i.category === 'paket');
  }

  let printText = `${receiptTitle}\nResto: CHICKEN FIRE MATARAM\nPelanggan: ${customer}\nMeja: ${table}\nMetode: ${currentPayMethod}\n--------------------------------\n`;
  itemsToPrint.forEach(i => {
    printText += `${i.name} x${i.qty}\n`;
  });
  printText += `--------------------------------\nSiap Cetak Thermal Bluetooth`;

  alert(printText);
}

document.getElementById('export-excel-btn').addEventListener('click', async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    let reportData = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const dateStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString('id-ID') : '-';
      reportData.push({
        "ID Transaksi": doc.id,
        "Tanggal": dateStr,
        "Nama Pelanggan": data.customerName,
        "No Meja": data.tableNumber,
        "Metode Bayar": data.paymentMethod,
        "Total Belanja (Rp)": data.totalAmount,
        "Uang Bayar (Rp)": data.paidAmount,
        "Kembalian (Rp)": data.changeAmount
      });
    });

    if(reportData.length === 0) return alert('Belum ada data transaksi untuk diexport.');

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Omset");
    XLSX.writeFile(workbook, `Laporan_Omset_ChickenFire_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error("Gagal export excel:", err);
    alert("Gagal mengunduh laporan excel.");
  }
});

loadProducts();
