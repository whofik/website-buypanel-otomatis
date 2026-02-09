# 🚀 buy pansl – Payment Gateway QRIS

<p align="center">
  <img src="https://files.njy.my.id//dub5.jpg" alt="Thumbnail" />
</p>

Credit by Fik Projects  
Bebas rename, asal pake credit 

Sistem auto-create panel Pterodactyl berbasis Express.js + QRIS (Pakasir).  
User bayar → sistem cek pembayaran → panel otomatis dibuat → notifikasi Telegram.

---

## ✨ Fitur Utama

- Auto Create User & Server Pterodactyl
- Payment Gateway QRIS (Pakasir)
- Status transaksi: pending, success, failed, canceled
- Notifikasi Telegram realtime
- Support Admin / Reseller Panel
- Pilihan produk (1GB – Unlimited)
- API ready (frontend & backend)
- Auto detect panel maintenance
- In-memory database (Map)
- Webhook Pakasir

---

## 🧠 Alur Sistem

1. User pilih produk
2. Sistem generate Order ID
3. QRIS dibuat dari Pakasir
4. Status PENDING
5. User bayar QR
6. Sistem cek / webhook
7. Jika SUCCESS:
   - Buat user panel
   - Buat server
   - Kirim credential
   - Notif Telegram
8. Selesai

---

## 📦 Produk

1gb  – 1GB Panel  
2gb  – 2GB Panel  
3gb  – 3GB Panel  
4gb  – 4GB Panel  
5gb  – 5GB Panel  
unli – Unlimited Panel  
admin – Admin Panel  

---

## 🗂️ Struktur Folder
```projects
project/
├─ public/
│  ├─ home.html
│  ├─ payment.html
│  ├─ success.html
│  └─ history.html
├─ server.js
├─ package.json
├─ .env
└─ README.md
```
---

## ⚙️ Environment (.env)
```env
PORT=8080

domainPanel=https://panel.example.com  
apiKey=ptla_xxxx  
nestId=5  
eggId=15  
locId=1  

pakasirSlug=  
pakasirApiKey=  

telegramToken=xxxxx  
telegramChatId=xxxxx  

webhookUrl=https://domainlu.com/api/webhook/pakasir  

contactWa=628xxxx  
contactCh=https://whatsapp.com/channel/xxxx  
contactTg=https://t.me/xxxx  
```
---

## ▶️ Cara Menjalankan
```run
npm install  
npm start
```
---

## 🌍 Endpoint API
GET  /api/config  
POST /api/order  
GET  /api/check/:id  
POST /api/cancel  
POST /api/webhook/pakasir  

---



---

## ⚠️ Catatan

- Database masih in-memory
- Restart = data hilang
- nnti lu kmbngin sendiri wee😘🗿
- Jangan expose .env

---
