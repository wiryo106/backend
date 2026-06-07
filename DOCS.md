# Dokumentasi REST API - Jasa Service AC Backend

Dokumentasi ini menjelaskan semua endpoint REST API yang tersedia di backend ini beserta parameter, tipe akses (Role), contoh _request body_, dan _response_-nya.

---

## Enumerasi Database (Penting)

Sebelum menggunakan API, pastikan Anda memahami nilai konstan (Enum) yang wajib digunakan:

### 1. `Role` (Hak Akses Pengguna)
*   `ADMIN`: Pemilik usaha / Administrator.
*   `TECHNICIAN`: Teknisi lapangan.
*   `CUSTOMER`: Pelanggan biasa (default saat registrasi).

### 2. `BookingStatus` (Status Pesanan AC)
*   `PENDING`: Menunggu konfirmasi admin & alokasi teknisi (Status awal).
*   `ASSIGNED`: Teknisi sudah dialokasikan admin.
*   `IN_PROGRESS`: Teknisi sedang dalam proses pengerjaan di lokasi.
*   `COMPLETED`: Pekerjaan selesai dan foto bukti sudah diunggah.

---

## 1. Modul Autentikasi (`/api/auth`)

### 1.1. Registrasi Pelanggan Baru
Mendaftarkan pelanggan baru. Secara default role yang diberikan adalah `CUSTOMER`.

*   **URL**: `/api/auth/register`
*   **Method**: `POST`
*   **Auth Required**: No
*   **Request Body (JSON)**:
    ```json
    {
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "password": "password123",
      "phone": "08123456789"
    }
    ```
*   **Success Response**:
    *   **Code**: `201 Created`
    *   **Content**:
        ```json
        {
          "message": "User registered successfully",
          "userId": 1
        }
        ```

### 1.2. Login
Melakukan login untuk mendapatkan token JWT. Berlaku untuk Admin, Teknisi, maupun Pelanggan.

*   **URL**: `/api/auth/login`
*   **Method**: `POST`
*   **Auth Required**: No
*   **Request Body (JSON)**:
    ```json
    {
      "email": "budi@example.com",
      "password": "password123"
    }
    ```
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "message": "Login successful",
          "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
          "user": {
            "id": 1,
            "name": "Budi Santoso",
            "email": "budi@example.com",
            "role": "CUSTOMER"
          }
        }
        ```

### 1.3. Get My Profile
Mengambil data profil pengguna yang sedang login.

*   **URL**: `/api/auth/me`
*   **Method**: `GET`
*   **Auth Required**: Yes (Bearer Token)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "id": 1,
          "name": "Budi Santoso",
          "email": "budi@example.com",
          "role": "CUSTOMER",
          "phone": "08123456789"
        }
        ```

---

## 2. Modul Katalog Layanan (`/api/services`)

### 2.1. Ambil Semua Layanan
*   **URL**: `/api/services`
*   **Method**: `GET`
*   **Auth Required**: No
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        [
          {
            "id": 1,
            "name": "Cuci AC Rutin (0.5 - 1 PK)",
            "description": "Pembersihan AC indoor dan outdoor",
            "basePrice": 75000,
            "createdAt": "2026-06-05T10:00:00.000Z",
            "updatedAt": "2026-06-05T10:00:00.000Z"
          }
        ]
        ```

### 2.2. Tambah Layanan Baru
*   **URL**: `/api/services`
*   **Method**: `POST`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Request Body (JSON)**:
    ```json
    {
      "name": "Isi Freon R32",
      "description": "Isi ulang freon AC standar R32.",
      "basePrice": 150000
    }
    ```
*   **Success Response**:
    *   **Code**: `201 Created`
    *   **Content**:
        ```json
        {
          "id": 2,
          "name": "Isi Freon R32",
          "description": "Isi ulang freon AC standar R32.",
          "basePrice": 150000,
          "createdAt": "2026-06-05T11:00:00.000Z",
          "updatedAt": "2026-06-05T11:00:00.000Z"
        }
        ```

### 2.3. Ubah Layanan
*   **URL**: `/api/services/:id`
*   **Method**: `PUT`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Request Body (JSON)**:
    ```json
    {
      "name": "Cuci AC Rutin (1.5 - 2 PK)",
      "description": "Layanan pembersihan AC indoor dan outdoor.",
      "basePrice": 90000
    }
    ```
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "id": 1,
          "name": "Cuci AC Rutin (1.5 - 2 PK)",
          "description": "Layanan pembersihan AC indoor dan outdoor.",
          "basePrice": 90000,
          "createdAt": "2026-06-05T10:00:00.000Z",
          "updatedAt": "2026-06-05T11:30:00.000Z"
        }
        ```

### 2.4. Hapus Layanan
*   **URL**: `/api/services/:id`
*   **Method**: `DELETE`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "message": "Service deleted successfully"
        }
        ```

---

## 3. Modul Pemesanan (Bookings) (`/api/bookings`)

### 3.1. Cek Ketersediaan Kuota (Mencegah Overbooking)
Mengecek apakah jadwal di tanggal tertentu sudah penuh atau belum.

*   **URL**: `/api/bookings/check-availability?date=YYYY-MM-DD`
*   **Method**: `GET`
*   **Auth Required**: No (atau bisa juga digunakan oleh frontend sebelum request)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "date": "2026-06-10",
          "booked": 4,
          "limit": 10,
          "available": true
        }
        ```

### 3.2. Buat Pesanan Baru (Booking)
*   **URL**: `/api/bookings`
*   **Method**: `POST`
*   **Auth Required**: Yes (Role: `CUSTOMER`)
*   **Request Body (JSON)**:
    ```json
    {
      "serviceId": 1,
      "quantity": 2,
      "bookingDate": "2026-06-10",
      "address": "Jl. Merdeka No. 45, Solo",
      "complaint": "AC kurang dingin dan netes air"
    }
    ```
*   **Success Response**:
    *   **Code**: `201 Created`
    *   **Content**:
        ```json
        {
          "message": "Pesanan Berhasil Dibuat",
          "booking": {
            "id": 1,
            "customerId": 1,
            "serviceId": 1,
            "quantity": 2,
            "bookingDate": "2026-06-10T00:00:00.000Z",
            "address": "Jl. Merdeka No. 45, Solo",
            "complaint": "AC kurang dingin dan netes air",
            "status": "PENDING",
            "totalPrice": 150000,
            "createdAt": "2026-06-05T12:00:00.000Z",
            "updatedAt": "2026-06-05T12:00:00.000Z"
          }
        }
        ```
*   **Error Response (Jika Kuota Penuh)**:
    *   **Code**: `400 Bad Request`
    *   **Content**:
        ```json
        {
          "error": "Maaf, jadwal operasional pada tanggal ini sudah penuh. Mohon pilih hari lain."
        }
        ```

### 3.3. Lihat Riwayat Pesanan Saya
Menampilkan seluruh daftar riwayat pesanan milik pelanggan yang sedang login.

*   **URL**: `/api/bookings/customer`
*   **Method**: `GET`
*   **Auth Required**: Yes (Role: `CUSTOMER`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        [
          {
            "id": 1,
            "customerId": 1,
            "serviceId": 1,
            "status": "PENDING",
            "address": "Jl. Merdeka No. 45, Solo",
            "service": {
              "name": "Cuci AC Rutin (0.5 - 1 PK)"
            },
            "assignments": [],
            "documentation": null
          }
        ]
        ```

### 3.4. Lihat Detail Pesanan
*   **URL**: `/api/bookings/:id`
*   **Method**: `GET`
*   **Auth Required**: Yes (Bisa diakses oleh pelanggan pemilik pesanan, atau Admin/Teknisi)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "id": 1,
          "address": "Jl. Merdeka No. 45, Solo",
          "status": "ASSIGNED",
          "service": {
            "name": "Cuci AC Rutin (0.5 - 1 PK)"
          },
          "customer": {
            "name": "Budi Santoso",
            "phone": "08123456789"
          },
          "assignments": [
            {
              "technician": {
                "name": "Joko Teknisi",
                "phone": "08987654321"
              }
            }
          ],
          "documentation": null
        }
        ```

---

## 4. Modul Admin Dashboard (`/api/admin`)

### 4.1. Lihat Daftar Antrean Order (Menunggu Konfirmasi)
*   **URL**: `/api/admin/bookings/pending`
*   **Method**: `GET`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        [
          {
            "id": 1,
            "bookingDate": "2026-06-10T00:00:00.000Z",
            "status": "PENDING",
            "customer": {
              "name": "Budi Santoso",
              "phone": "08123456789"
            },
            "service": {
              "name": "Cuci AC Rutin (0.5 - 1 PK)"
            }
          }
        ]
        ```

### 4.2. Cari Teknisi Tersedia di Tanggal Tertentu
Mencari daftar teknisi lapangan untuk ditugaskan.

*   **URL**: `/api/admin/technicians/available?date=YYYY-MM-DD`
*   **Method**: `GET`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        [
          {
            "id": 2,
            "name": "Joko Teknisi",
            "phone": "08987654321",
            "activeAssignments": 1
          },
          {
            "id": 3,
            "name": "Agus Teknisi",
            "phone": "08888888888",
            "activeAssignments": 0
          }
        ]
        ```

### 4.3. Alokasi / Konfirmasi & Tugaskan Teknisi
Menugaskan pesanan kepada seorang teknisi spesifik. Status pesanan akan otomatis berubah menjadi `ASSIGNED` (Teknisi Ditugaskan).

*   **URL**: `/api/admin/bookings/:id/assign`
*   **Method**: `POST`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Request Body (JSON)**:
    ```json
    {
      "technicianId": 2
    }
    ```
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "message": "Technician assigned successfully",
          "result": [
            {
              "id": 1,
              "bookingId": 1,
              "technicianId": 2,
              "assignedAt": "2026-06-05T13:00:00.000Z"
            },
            {
              "id": 1,
              "status": "ASSIGNED"
            }
          ]
        }
        ```

### 4.4. Lihat Rekapitulasi & Laporan Pendapatan
*   **URL**: `/api/admin/reports?month=06&year=2026`
*   **Method**: `GET`
*   **Auth Required**: Yes (Role: `ADMIN`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "totalBookings": 15,
          "completedBookings": 12,
          "totalRevenue": 1500000
        }
        ```

---

## 5. Modul Eksekusi Lapangan Teknisi (`/api/technician`)

### 5.1. Lihat Tugas Hari Ini
Melihat daftar tugas pesanan yang telah ditugaskan kepada teknisi login (status `ASSIGNED` atau `IN_PROGRESS`).

*   **URL**: `/api/technician/tasks`
*   **Method**: `GET`
*   **Auth Required**: Yes (Role: `TECHNICIAN`)
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        [
          {
            "id": 1,
            "bookingDate": "2026-06-10T00:00:00.000Z",
            "address": "Jl. Merdeka No. 45, Solo",
            "complaint": "AC kurang dingin dan netes air",
            "status": "ASSIGNED",
            "customer": {
              "name": "Budi Santoso",
              "phone": "08123456789"
            },
            "service": {
              "name": "Cuci AC Rutin (0.5 - 1 PK)"
            }
          }
        ]
        ```

### 5.2. Update Status Menjadi "Proses Perbaikan"
Tombol "Mulai Pengerjaan" pada aplikasi teknisi. _(Catatan: Endpoint ini khusus digunakan untuk mengubah status pesanan dari ASSIGNED ke IN_PROGRESS)_.

*   **URL**: `/api/technician/tasks/:id/status`
*   **Method**: `PUT`
*   **Auth Required**: Yes (Role: `TECHNICIAN`)
*   **Request Body (JSON)**:
    ```json
    {
      "status": "IN_PROGRESS"
    }
    ```
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "message": "Status updated to IN_PROGRESS",
          "booking": {
            "id": 1,
            "status": "IN_PROGRESS",
            "updatedAt": "2026-06-10T09:00:00.000Z"
          }
        }
        ```

### 5.3. Kirim Laporan Selesai Tugas & Upload Dokumentasi (Validasi Bukti Kerja)
Tombol "Selesai" pada aplikasi teknisi. Mengirim form berisi foto fisik hasil kerja. Jika foto tidak disertakan, server akan menolak.

*   **URL**: `/api/technician/tasks/:id/complete`
*   **Method**: `POST`
*   **Auth Required**: Yes (Role: `TECHNICIAN`)
*   **Content-Type**: `multipart/form-data`
*   **Request Body (Form Data)**:
    *   `photo`: [Berkas Gambar] _(Wajib/Required)_
    *   `description`: "Freon berhasil diisi ulang dan evaporator dicuci." _(Opsional)_
*   **Success Response**:
    *   **Code**: `200 OK`
    *   **Content**:
        ```json
        {
          "message": "Task completed successfully",
          "result": [
            {
              "id": 1,
              "bookingId": 1,
              "photoUrl": "/uploads/16281729183-193817.jpg",
              "description": "Freon berhasil diisi ulang dan evaporator dicuci.",
              "uploadedAt": "2026-06-10T10:00:00.000Z"
            },
            {
              "id": 1,
              "status": "COMPLETED"
            }
          ]
        }
        ```
*   **Error Response (Jika Tanpa Foto)**:
    *   **Code**: `400 Bad Request`
    *   **Content**:
        ```json
        {
          "error": "Gagal. Dokumentasi foto hasil pekerjaan wajib dilampirkan sebelum menyelesaikan tugas."
        }
        ```
