import { sql } from "./neon-config.js";

let adminMasterPassword = "1234";

// === LOGIN ADMIN ===
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();

  if (u === 'admin' && p === adminMasterPassword) {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    loadAdminProducts();
    loadCashiers();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
});

// === MANAJEMEN KASIR ===
document.getElementById('add-cashier-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cashier-name-input').value.trim();
  const username = document.getElementById('cashier-user-input').value.trim();
  const password = document.getElementById('cashier-pass-input').value.trim();
  try {
    await sql`INSERT INTO cashiers (name, username, password) VALUES (${name}, ${username}, ${password})`;
    alert("Kasir ditambahkan!"); document.getElementById('add-cashier-form').reset(); loadCashiers();
  } catch (err) { alert("Gagal. Username mungkin sudah ada."); }
});

async function loadCashiers() {
  const container = document.getElementById('cashier-list-admin');
  container.innerHTML = '';
  try {
    const rows = await sql`SELECT * FROM cashiers ORDER BY created_at DESC`;
    if (!rows.length) return container.innerHTML = '<p class="text-[10px] text-zinc-500">Belum ada kasir.</p>';
    rows.forEach(c => {
      container.innerHTML += `
        <div class="flex justify-between items-center bg-zinc-950 border border-zinc-800 p-2 rounded text-xs">
          <div><span class="font-bold text-zinc-200">${c.name}</span> <span class="text-[9px] text-zinc-500">(${c.username})</span></div>
          <button onclick="removeCashier(${c.id})" class="bg-red-950 text-red-400 border border-red-800 px-2 py-1 rounded text-[9px]">Hapus</button>
        </div>`;
    });
  } catch (err) {}
}

window.removeCashier = async (id) => {
  if (confirm("Hapus akun kasir ini?")) { await sql`DELETE FROM cashiers WHERE id = ${id}`; loadCashiers(); }
};

// === GANTI PASSWORD ADMIN ===
document.getElementById('change-admin-pass-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const newPass = document.getElementById('new-admin-pass').value.trim();
  if (newPass) {
    adminMasterPassword = newPass;
    alert("Password Admin diperbarui!"); document.getElementById('change-admin-pass-form').reset();
  }
});

// === MANAJEMEN PRODUK ===
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  btn.innerText = "Memproses..."; btn.disabled = true;
  try {
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const discountType = document.getElementById('prod-discount-type').value;
    const discountValue = parseFloat(document.getElementById('prod-discount-value').value) || 0;
    const file = document.getElementById('prod-image-file').files[0];
    let imageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";
    if (file) imageUrl = await compressAndReadImage(file);

    await sql`INSERT INTO products (name, category, price, discount_type, discount_value, image_url) VALUES (${name}, ${category}, ${price}, ${discountType}, ${discountValue}, ${imageUrl})`;
    alert("Menu disimpan!"); document.getElementById('add-product-form').reset(); loadAdminProducts();
  } catch (err) { alert("Gagal simpan menu."); }
  finally { btn.innerText = "Simpan Menu"; btn.disabled = false; }
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
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-menu-list');
  try {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    container.innerHTML = '';
    if (!rows.length) return container.innerHTML = '<p class="text-[10px] text-zinc-500">Belum ada menu.</p>';
    rows.forEach(p => {
      container.innerHTML += `
        <div class="flex items-center justify-between border border-zinc-800 p-2 rounded bg-zinc-950 text-xs">
          <div class="flex items-center space-x-2">
            <img src="${p.image_url}" class="w-10 h-10 object-cover rounded">
            <div><h5 class="font-bold text-zinc-200">${p.name}</h5><p class="text-zinc-400 text-[10px]">Rp ${parseFloat(p.price).toLocaleString('id-ID')}</p></div>
          </div>
          <button onclick="deleteProduct(${p.id})" class="bg-red-950 text-red-400 border border-red-800 px-2 py-1 rounded text-[10px]">Hapus</button>
        </div>`;
    });
  } catch (err) {}
}

window.deleteProduct = async (id) => {
  if (confirm("Hapus menu ini?")) { await sql`DELETE FROM products WHERE id = ${id}`; loadAdminProducts(); }
};
