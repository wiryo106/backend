# backend uas

> - dokumentasi API: [DOCS.md](DOCS.md)
> - collection postman: https://cdn.krepowo.my.id/files/UAS%20Pak%20Sopingi.postman_collection.json

library yang digunakan:
- express (web framework)
- prisma (ORM database)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- multer (file upload)
- zod (validasi input)
- cors (izin akses lintas domain)

database:
- mysql

cara setup backend:
1. Clone repository
2. Buka folder hasil clone di vscode
4. buka xampp/laragon, nyalakan mysql dan buat database bernama "uasproject"
3. buka terminal lalu ketik:
   - `npm install`
   - `npx prisma generate`
   - `npx prisma db push`
5. buat file .env, lalu isi dengan:
```
DATABASE_URL="mysql://root@localhost:3306/uasproject"
DAILY_BOOKING_LIMIT=10
```
6. ketik `npm run dev` di terminal dan tunggu sampe ada tulisan server running