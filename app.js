import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let cart = [];
let allProducts = [];
let allCashiers = [];
let currentPayMethod = "CASH";
let currentCategory = "semua";
let activeCashierName = "";
let adminMasterPassword = "1234"; // Password Master Admin Bawaan

// 1. AUTENTIKASI LOGIN (ADMIN & KASIR)
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
  renderCart();
});

// 2. KELOLA AKUN KASIR SISWA (ADMIN PANEL)
document.getElementById('add-cashier-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cashier-name-input').value.trim();
  const username = document.getElementById('cashier-user-input').value.trim();
  const password = document.getElementById('cashier-pass-input').value.trim();

  try {
    await addDoc(collection(db, "cashiers"), {
      name,
      username,
      password,
      createdAt: serverTimestamp()
    });
    alert("Akun kasir siswa berhasil dibuat!");
    document.getElementById('add-cashier-form').reset();
    loadCashiers();
  } catch (err) {
    console.error("Gagal menambah akun kasir:", err);
  }
});

async function loadCashiers() {
  const container = document.getElementById('cashier-list-admin');
  if(!container) return;
  container.innerHTML = '';
  allCashiers = [];

  try {
    const snap = await getDocs(collection(db, "cashiers"));
    snap.forEach((d) => {
      const data = d.data();
      allCashiers.push({ id: d.id, ...data });
      container.innerHTML += `
        <div class="flex justify-between items-center bg-gray-50 border p-2 rounded text-xs">
          <div>
            <span class="font-bold text-gray-800">${data.name}</span>
            <span class="text-[10px] text-gray-500 block">User: ${data.username} | Pass: ${data.password}</span>
          </div>
          <button onclick="removeCashier('${d.id}')" class="bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200 text-[10px]">Hapus</button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Gagal memuat data kasir:", err);
  }
}

window.removeCashier = async (id) => {
  if(confirm("Hapus akun kasir ini?")) {
    await deleteDoc(doc(db, "cashiers", id));
    loadCashiers();
  }
};

// 3. GANTI PASSWORD ADMIN
document.getElementById('change-admin-pass-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const newPass = document.getElementById('new-admin-pass').value.trim();
  if(newPass) {
    adminMasterPassword = newPass;
    alert("Password Admin berhasil diperbarui!");
    document.getElementById('change-admin-pass-form').reset();
  }
});

// 4. UPLOAD MENU BARU (DENGAN SAFE FALLBACK FOTO)
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  btn.innerText = "Menyimpan...";
  btn.disabled = true;

  try {
    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const discountType = document.getElementById('prod-discount-type').value;
    const discountValue = parseFloat(document.getElementById('prod-discount-value').value) || 0;
    const fileInput = document.getElementById('prod-image-file');
    const file = fileInput.files[0];

    let imageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"; // Gambar default jika upload publik gagal

    if (file) {
      btn.innerText = "Mengunggah Foto...";
      try {
        const formData = new FormData();
        formData.append("image", file);

        const imgurResponse = await fetch("https://api.imgur.com/3/image", {
          method: "POST",
          headers: { Authorization: "Client-ID c982d61d56223b2" },
          body: formData
        });

        const imgurData = await imgurResponse.json();
        if (imgurData.success && imgurData.data && imgurData.data.link) {
          imageUrl = imgurData.data.link;
        }
      } catch (imgErr) {
        console.warn("Upload gambar eksternal gagal, memakai gambar bawaan:", imgErr);
      }
    }

    btn.innerText = "Menyimpan ke Database...";

    await addDoc(collection(db, "products"), {
      name,
      category,
      price,
      discountType,
      discountValue,
      imageUrl,
      createdAt: serverTimestamp()
    });

    alert("Menu berhasil ditambahkan!");
    document.getElementById('add-product-form').reset();
    loadAdminProducts();

  } catch (err) {
    console.error("Error Simpan Menu:", err);
    alert("Terjadi kesalahan saat menyimpan menu.");
  } finally {
    btn.innerText = "Simpan & Upload Menu";
    btn.disabled = false;
  }
});

// MENAMPILKAN DAFTAR MENU DI ADMIN PANEL (+ HAPUS)
async function loadAdminProducts() {
  const container = document.getElementById('admin-menu-list');
  if(!container) return;
  container.innerHTML = '<p class="text-xs text-gray-400 text-center py-5">Memuat menu...</p>';

  try {
    const snap = await getDocs(collection(db, "products"));
    container.innerHTML = '';
    snap.forEach((docSnap) => {
      const p = docSnap.data();
      let discTag = p.discountType === 'percent' ? `${p.discountValue}% OFF` : p.discountType === 'nominal' ? `Pot. Rp ${p.discountValue.toLocaleString('id-ID')}` : '';
      
      container.innerHTML += `
        <div class="flex items-center justify-between border p-2 rounded-lg bg-gray-50 text-xs">
          <div class="flex items-center space-x-2">
            <img src="${p.imageUrl}" class="w-10 h-10 object-cover rounded" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'">
            <div>
              <h5 class="font-bold text-gray-800">${p.name}</h5>
              <p class="text-gray-500 text-[10px]">Rp ${p.price.toLocaleString('id-ID')} ${discTag ? `<span class="text-red-600 font-bold ml-1">(${discTag})</span>` : ''}</p>
            </div>
          </div>
          <button onclick="deleteProduct('${docSnap.id}')" class="bg-red-600 text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-red-700">
            <i class="fas fa-trash-alt mr-1"></i> Delete
          </button>
        </div>
      `;
    });
  } catch(err) {
    container.innerHTML = '<p class="text-xs text-red-500 text-center">Gagal memuat menu.</p>';
  }
}

window.deleteProduct = async (id) => {
  if(confirm("Yakin ingin menghapus menu ini?")) {
    await deleteDoc(doc(db, "products", id));
    loadAdminProducts();
  }
};

// 5. KATALOG KASIR (HITUNG DISKON OTOMATIS)
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if(!grid) return;
  grid.innerHTML = '<p class="text-xs text-gray-400 col-span-4 text-center py-10">Memuat menu...</p>';
  
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    allProducts = [];
    querySnapshot.forEach((doc) => {
      allProducts.push({ id: doc.id, ...doc.data() });
    });
    renderProducts();
  } catch (err) {
    grid.innerHTML = '<p class="text-xs text-red-500 col-span-4 text-center py-10">Gagal memuat produk!</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const filtered = allProducts.filter(p => currentCategory === 'semua' || p.category === currentCategory);

  filtered.forEach(p => {
    let finalPrice = p.price;
    let hasDiscount = false;
    if (p.discountType === 'percent' && p.discountValue > 0) {
      finalPrice = p.price - (p.price * (p.discountValue / 100));
      hasDiscount = true;
    } else if (p.discountType === 'nominal' && p.discountValue > 0) {
      finalPrice = p.price - p.discountValue;
      hasDiscount = true;
    }

    grid.innerHTML += `
      <div class="product-card bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm hover:border-red-500 cursor-pointer transition relative" data-id="${p.id}">
        ${hasDiscount ? `<span class="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">PROMO</span>` : ''}
        <img src="${p.imageUrl}" class="w-full h-24 object-cover" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'">
        <div class="p-2">
          <h4 class="font-bold text-gray-800 text-xs truncate">${p.name}</h4>
          ${hasDiscount ? `
            <p class="text-gray-400 line-through text-[10px]">Rp ${p.price.toLocaleString('id-ID')}</p>
            <p class="text-merah-id font-black text-xs">Rp ${finalPrice.toLocaleString('id-ID')}</p>
          ` : `
            <p class="text-merah-id font-black text-xs">Rp ${p.price.toLocaleString('id-ID')}</p>
          `}
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

// 6. KERANJANG & STRUK (ALAMAT: KARANGANYAR - JAWA TENGAH)
function addToCart(prod) {
  let finalPrice = prod.price;
  if (prod.discountType === 'percent' && prod.discountValue > 0) {
    finalPrice = prod.price - (prod.price * (prod.discountValue / 100));
  } else if (prod.discountType === 'nominal' && prod.discountValue > 0) {
    finalPrice = prod.price - prod.discountValue;
  }

  const existing = cart.find(i => i.id === prod.id);
  if(existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...prod, finalPrice, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.finalPrice * item.qty;
    total += subtotal;
    container.innerHTML += `
      <div class="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
        <div class="w-1/2">
          <div class="font-bold text-gray-800 truncate">${item.name}</div>
          <div class="text-gray-400 text-[10px]">Rp ${item.finalPrice.toLocaleString('id-ID')}</div>
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
  const qrisGroup = document.getElementById('qris-input-group');

  if(m === 'CASH') {
    btnC.className = "py-1.5 rounded-md border text-xs font-bold border-red-600 bg-red-600 text-white";
    btnQ.className = "py-1.5 rounded-md border text-xs font-bold border-gray-300 bg-gray-100 text-gray-700";
    cashGroup.classList.remove('hidden');
    qrisGroup.classList.add('hidden');
  } else {
    btnQ.className = "py-1.5 rounded-md border text-xs font-bold border-red-600 bg-red-600 text-white";
    btnC.className = "py-1.5 rounded-md border text-xs font-bold border-gray-300 bg-gray-100 text-gray-700";
    qrisGroup.classList.remove('hidden');
    cashGroup.classList.add('hidden');
  }
}

// SIMPAN TRANSAKSI & AUTOMATIC STRUK KASIR
document.getElementById('process-order-btn').addEventListener('click', async () => {
  if(cart.length === 0) return alert('Pilih pesanan terlebih dahulu!');
  
  const qrisRRN = document.getElementById('qris-rrn-input').value.trim();
  if(currentPayMethod === 'QRIS' && qrisRRN.length !== 12) {
    return alert('Kode RRN QRIS wajib diisi tepat 12 digit angka!');
  }

  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const pay = currentPayMethod === 'QRIS' ? total : (parseFloat(document.getElementById('pay-amount').value) || 0);
  if(currentPayMethod === 'CASH' && pay < total) return alert('Uang pembayaran kurang!');

  try {
    await addDoc(collection(db, "orders"), {
      cashierName: activeCashierName || "Kasir Siswa",
      customerName: document.getElementById('customer-select').value,
      tableNumber: document.getElementById('table-no').value || "-",
      paymentMethod: currentPayMethod,
      qrisRRN: currentPayMethod === 'QRIS' ? qrisRRN : "-",
      items: cart,
      totalAmount: total,
      paidAmount: pay,
      changeAmount: pay - total,
      createdAt: serverTimestamp()
    });

    printReceipt('kasir', activeCashierName || "Kasir Siswa");
    alert(`Transaksi Berhasil Disimpan!`);
    cart = [];
    document.getElementById('qris-rrn-input').value = '';
    document.getElementById('pay-amount').value = '';
    renderCart();
  } catch (err) {
    console.error("Gagal simpan transaksi:", err);
    alert("Terjadi kesalahan saat menyimpan transaksi.");
  }
});

// CETAK STRUK DAPUR & BAR
document.getElementById('print-kitchen-btn').addEventListener('click', () => printReceipt('kitchen', activeCashierName || "Kasir Siswa"));
document.getElementById('print-drink-btn').addEventListener('click', () => printReceipt('drink', activeCashierName || "Kasir Siswa"));

function printReceipt(type, cashier) {
  if(cart.length === 0) return alert('Keranjang belanja masih kosong!');
  const customer = document.getElementById('customer-select').value;
  const table = document.getElementById('table-no').value || '-';
  const qrisRRN = document.getElementById('qris-rrn-input').value.trim();

  let receiptTitle = type === 'kasir' ? "=== STRUK BUKTI PEMBELIAN ===" : type === 'kitchen' ? "=== STRUK DAPUR ===" : "=== STRUK BAR ===";
  let itemsToPrint = cart;
  if(type === 'kitchen') itemsToPrint = cart.filter(i => i.category === 'makanan' || i.category === 'paket');
  if(type === 'drink') itemsToPrint = cart.filter(i => i.category === 'minuman' || i.category === 'paket');

  let printText = `${receiptTitle}\nCHICKEN FIRE MATARAM\nAlamat: Karanganyar - Jawa Tengah\nKasir: ${cashier}\nPelanggan: ${customer}\nMeja: ${table}\nMetode: ${currentPayMethod}\n`;
  if(currentPayMethod === 'QRIS' && qrisRRN) {
    printText += `RRN QRIS: ${qrisRRN}\n`;
  }
  printText += `--------------------------------\n`;

  itemsToPrint.forEach(i => {
    printText += `${i.name} x${i.qty} = Rp ${(i.finalPrice * i.qty).toLocaleString('id-ID')}\n`;
  });
  printText += `--------------------------------\nTerima Kasih Atas Kunjungan Anda!\nNikmati Pedasnya Chicken Fire!`;

  alert(printText);
}

// 7. EXPORT LAPORAN EXCEL
document.getElementById('export-excel-btn').addEventListener('click', async () => {
  try {
    const period = document.getElementById('export-filter-period').value;
    const snap = await getDocs(collection(db, "orders"));
    let reportData = [];
    const now = new Date();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const txDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
      
      let include = true;
      if (period === 'minggu') {
        const diffDays = (now - txDate) / (1000 * 3600 * 24);
        if (diffDays > 7) include = false;
      } else if (period === 'bulan') {
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) include = false;
      }

      if (include) {
        reportData.push({
          "ID Transaksi": docSnap.id,
          "Tanggal": txDate.toLocaleString('id-ID'),
          "Lokasi": "Karanganyar - Jawa Tengah",
          "Input Oleh Kasir": data.cashierName || "-",
          "Nama Pelanggan": data.customerName,
          "No Meja": data.tableNumber,
          "Metode Bayar": data.paymentMethod,
          "Kode RRN QRIS": data.qrisRRN || "-",
          "Total Belanja (Rp)": data.totalAmount,
          "Uang Bayar (Rp)": data.paidAmount,
          "Kembalian (Rp)": data.changeAmount
        });
      }
    });

    if(reportData.length === 0) return alert('Tidak ada data transaksi pada periode ini.');

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Omset");
    XLSX.writeFile(workbook, `Laporan_ChickenFire_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error("Gagal export excel:", err);
  }
});

loadCashiers();
