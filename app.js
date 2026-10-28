import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let cart = [];
let lastSavedCart = []; // Memori untuk menyimpan pesanan terakhir setelah checkout
let lastSavedCustomer = "Pelanggan Umum";
let lastSavedTable = "-";

let allProducts = [];
let allCashiers = [];
let currentPayMethod = "CASH";
let currentCategory = "semua";
let activeCashierName = "";
let adminMasterPassword = "1234";

// 1. AUTENTIKASI LOGIN
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
  lastSavedCart = [];
  renderCart();
});

// 2. KELOLA KASIR SISWA
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
    alert("Akun kasir siswa berhasil ditambahkan!");
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
        <div class="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs">
          <div>
            <span class="font-bold text-zinc-200">${data.name}</span>
            <span class="text-[10px] text-zinc-500 block">User: ${data.username} | Pass: ${data.password}</span>
          </div>
          <button onclick="removeCashier('${d.id}')" class="bg-red-950 text-red-400 border border-red-800 px-2 py-1 rounded font-bold hover:bg-red-900 text-[10px]">Hapus</button>
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

// 4. UPLOAD MENU BARU
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

    let imageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";

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

async function loadAdminProducts() {
  const container = document.getElementById('admin-menu-list');
  if(!container) return;
  container.innerHTML = '<p class="text-xs text-zinc-500 text-center py-5">Memuat menu...</p>';

  try {
    const snap = await getDocs(collection(db, "products"));
    container.innerHTML = '';
    snap.forEach((docSnap) => {
      const p = docSnap.data();
      let discTag = p.discountType === 'percent' ? `${p.discountValue}% OFF` : p.discountType === 'nominal' ? `Pot. Rp ${p.discountValue.toLocaleString('id-ID')}` : '';
      
      container.innerHTML += `
        <div class="flex items-center justify-between border border-zinc-800 p-2 rounded-lg bg-zinc-950 text-xs">
          <div class="flex items-center space-x-2">
            <img src="${p.imageUrl}" class="w-10 h-10 object-cover rounded-md" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'">
            <div>
              <h5 class="font-bold text-zinc-200">${p.name}</h5>
              <p class="text-zinc-400 text-[10px]">Rp ${p.price.toLocaleString('id-ID')} ${discTag ? `<span class="text-red-500 font-bold ml-1">(${discTag})</span>` : ''}</p>
            </div>
          </div>
          <button onclick="deleteProduct('${docSnap.id}')" class="bg-red-950 text-red-400 border border-red-800 px-2.5 py-1 rounded text-[10px] font-bold hover:bg-red-900">
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

// 5. KATALOG KASIR
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if(!grid) return;
  grid.innerHTML = '<p class="text-xs text-zinc-500 col-span-4 text-center py-10">Memuat menu...</p>';
  
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
    let discAmount = 0;
    let hasDiscount = false;

    if (p.discountType === 'percent' && p.discountValue > 0) {
      discAmount = p.price * (p.discountValue / 100);
      finalPrice = p.price - discAmount;
      hasDiscount = true;
    } else if (p.discountType === 'nominal' && p.discountValue > 0) {
      discAmount = p.discountValue;
      finalPrice = p.price - discAmount;
      hasDiscount = true;
    }

    grid.innerHTML += `
      <div class="product-card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-red-600 cursor-pointer transition relative group" data-id="${p.id}">
        ${hasDiscount ? `<span class="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">PROMO</span>` : ''}
        <img src="${p.imageUrl}" class="w-full h-24 object-cover group-hover:scale-105 transition duration-200" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'">
        <div class="p-2.5">
          <h4 class="font-bold text-zinc-100 text-xs truncate">${p.name}</h4>
          ${hasDiscount ? `
            <p class="text-zinc-500 line-through text-[10px]">Rp ${p.price.toLocaleString('id-ID')}</p>
            <p class="text-red-500 font-black text-xs">Rp ${finalPrice.toLocaleString('id-ID')}</p>
          ` : `
            <p class="text-red-500 font-black text-xs">Rp ${p.price.toLocaleString('id-ID')}</p>
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
      b.className = "cat-btn bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold px-3.5 py-1.5 rounded-lg text-xs hover:bg-zinc-800 transition";
    });
    btn.className = "cat-btn bg-red-600 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow transition";
    currentCategory = btn.dataset.cat;
    renderProducts();
  });
});

// 6. KERANJANG KASIR
function addToCart(prod) {
  let finalPrice = prod.price;
  let discAmount = 0;

  if (prod.discountType === 'percent' && prod.discountValue > 0) {
    discAmount = prod.price * (prod.discountValue / 100);
    finalPrice = prod.price - discAmount;
  } else if (prod.discountType === 'nominal' && prod.discountValue > 0) {
    discAmount = prod.discountValue;
    finalPrice = prod.price - discAmount;
  }

  const existing = cart.find(i => i.id === prod.id);
  if(existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...prod, finalPrice, discAmount, qty: 1, itemNote: "" });
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  let total = 0;

  if(cart.length === 0) {
    container.innerHTML = '<p class="text-xs text-zinc-500 text-center py-8">Keranjang belanja kosong</p>';
    document.getElementById('cart-total').innerText = 'Rp 0';
    calcChange();
    return;
  }

  cart.forEach((item, index) => {
    const subtotal = item.finalPrice * item.qty;
    total += subtotal;

    container.innerHTML += `
      <div class="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <div class="w-1/2">
            <div class="font-bold text-zinc-100 truncate">${item.name}</div>
            <div class="text-zinc-400 text-[10px]">
              Rp ${item.finalPrice.toLocaleString('id-ID')}
              ${item.discAmount > 0 ? `<span class="text-red-400 font-bold ml-1">(Disc Rp ${item.discAmount.toLocaleString('id-ID')})</span>` : ''}
            </div>
          </div>

          <div class="font-black text-red-500 w-20 text-right">
            Rp ${subtotal.toLocaleString('id-ID')}
          </div>
        </div>

        <div class="flex items-center space-x-2 pt-1 border-t border-zinc-900">
          <div class="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex-shrink-0">
            <button class="btn-minus w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold rounded flex items-center justify-center transition" data-index="${index}">-</button>
            <span class="font-black text-white w-5 text-center text-xs">${item.qty}</span>
            <button class="btn-plus w-5 h-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center justify-center transition" data-index="${index}">+</button>
          </div>

          <input type="text" placeholder="Catatan (Cth: Tanpa gula)..." value="${item.itemNote || ''}" 
            onchange="updateItemNote(${index}, this.value)" 
            class="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-amber-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500">
        </div>
      </div>
    `;
  });

  document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');
  document.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, -1)));
  document.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', (e) => updateQty(e.target.dataset.index, 1)));
  calcChange();
}

window.updateItemNote = (idx, val) => {
  if (cart[idx]) {
    cart[idx].itemNote = val.trim();
  }
};

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

  if(m === 'CASH') {
    btnC.className = "py-2 rounded-lg border text-xs font-bold border-red-600 bg-red-600 text-white transition";
    btnQ.className = "py-2 rounded-lg border text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 transition";
  } else {
    btnQ.className = "py-2 rounded-lg border text-xs font-bold border-blue-600 bg-blue-600 text-white transition";
    btnC.className = "py-2 rounded-lg border text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 transition";
  }
}

document.getElementById('pay-amount').addEventListener('input', calcChange);

function calcChange() {
  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const pay = parseFloat(document.getElementById('pay-amount').value) || 0;
  const change = pay - total;
  document.getElementById('change-amount').innerText = 'Rp ' + (change > 0 ? change.toLocaleString('id-ID') : '0');
}

// 7. SIMPAN TRANSAKSI & CETAK STRUK
document.getElementById('process-order-btn').addEventListener('click', async () => {
  if(cart.length === 0) return alert('Pilih pesanan terlebih dahulu!');

  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const pay = currentPayMethod === 'QRIS' ? total : (parseFloat(document.getElementById('pay-amount').value) || 0);
  if(currentPayMethod === 'CASH' && pay < total) return alert('Uang pembayaran kurang!');

  const customerName = document.getElementById('customer-select').value || "Pelanggan Umum";
  const tableNumber = document.getElementById('table-no').value || "-";

  try {
    await addDoc(collection(db, "orders"), {
      cashierName: activeCashierName || "Kasir Siswa",
      customerName: customerName,
      tableNumber: tableNumber,
      paymentMethod: currentPayMethod,
      status: "COMPLETED",
      items: cart,
      totalAmount: total,
      paidAmount: pay,
      changeAmount: pay - total,
      createdAt: serverTimestamp()
    });

    // Simpan salinan transaksi ke memori sebelum dikosongkan
    lastSavedCart = [...cart];
    lastSavedCustomer = customerName;
    lastSavedTable = tableNumber;

    printReceipt('kasir', activeCashierName || "Kasir Siswa");
    alert(`Transaksi Berhasil Disimpan! Silakan cetak Struk Dapur / Struk Bar jika diperlukan.`);
    
    // Kosongkan form dan keranjang untuk transaksi berikutnya
    cart = [];
    document.getElementById('pay-amount').value = '';
    renderCart();
  } catch (err) {
    console.error("Gagal simpan transaksi:", err);
    alert("Terjadi kesalahan saat menyimpan transaksi.");
  }
});

// Tombol Struk Dapur & Struk Bar mendukung cetak sebelum ATAU sesudah pembayaran
document.getElementById('print-kitchen-btn').addEventListener('click', () => printReceipt('kitchen', activeCashierName || "Kasir Siswa"));
document.getElementById('print-drink-btn').addEventListener('click', () => printReceipt('drink', activeCashierName || "Kasir Siswa"));

function printReceipt(type, cashier) {
  // Gunakan keranjang aktif jika ada, jika keranjang aktif kosong gunakan pesanan yang baru saja disimpan
  let itemsToPrint = cart.length > 0 ? cart : lastSavedCart;
  let customer = cart.length > 0 ? (document.getElementById('customer-select').value || "Pelanggan Umum") : lastSavedCustomer;
  let table = cart.length > 0 ? (document.getElementById('table-no').value || '-') : lastSavedTable;

  if(itemsToPrint.length === 0) return alert('Tidak ada transaksi yang dapat dicetak!');

  let receiptTitle = type === 'kasir' ? "=== STRUK BUKTI PEMBELIAN ===" : type === 'kitchen' ? "=== STRUK DAPUR ===" : "=== STRUK BAR ===";
  
  if(type === 'kitchen') itemsToPrint = itemsToPrint.filter(i => i.category === 'makanan' || i.category === 'paket');
  if(type === 'drink') itemsToPrint = itemsToPrint.filter(i => i.category === 'minuman' || i.category === 'paket');

  if(itemsToPrint.length === 0) return alert(`Tidak ada menu kategori ${type === 'kitchen' ? 'makanan' : 'minuman'} pada pesanan ini.`);

  let printText = `${receiptTitle}\nCHICKEN FIRE MATARAM\nAlamat: Karanganyar - Jawa Tengah\nKasir: ${cashier}\nCustomer: ${customer}\nMeja: ${table}\nMetode: ${currentPayMethod}\n--------------------------------\n`;

  itemsToPrint.forEach(i => {
    printText += `${i.name} x${i.qty} = Rp ${(i.finalPrice * i.qty).toLocaleString('id-ID')}\n`;
    if(i.itemNote) {
      printText += `   *Req: ${i.itemNote}\n`;
    }
  });
  printText += `--------------------------------\nTerima Kasih Atas Kunjungan Anda!\nNikmati Pedasnya Chicken Fire!`;

  alert(printText);
}

loadCashiers();
