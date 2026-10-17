# คู่มือ: แยก Subdomain บน Cloudflare DNS (สำหรับรัน Cloud 24 ชั่วโมง)
# SpotiQuiz — Real-Time Tactical Music Trivia Duel

คู่มือนี้สำหรับโครงสร้างสถาปัตยกรรมระดับมืออาชีพ: **แยก Subdomain ใน Cloudflare DNS** โดยให้หน้าเว็บหลักและเซิร์ฟเวอร์ WebSocket แยกโดเมนกันอย่างชัดเจนภายใต้โดเมนหลัก `hxvapp.com`

---

## 🏗️ โครงสร้างสถาปัตยกรรม (Architecture)

| ส่วนประกอบ | Domain / URL | ระบบที่ใช้รัน | หน้าที่ |
| :--- | :--- | :--- | :--- |
| **Frontend (เว็บแอป)** | `https://jam.hxvapp.com` | **Firebase Hosting** | เสิร์ฟหน้าเว็บ React (HTML/CSS/JS) รวดเร็วผ่าน Global CDN ของ Google |
| **Backend (เซิร์ฟเวอร์)** | `wss://ws.hxvapp.com/ws`<br>`https://ws.hxvapp.com/api` | **Google Cloud Run** หรือ Cloud VPS (รัน 24 ชม.) | จัดการห้องแข่งขัน, ระบบจับเวลา, การ์ด Sabotage, เสียงเพลง CORS และ WebSocket Real-Time |

---

## 🚀 ขั้นตอนที่ 1: Deploy เซิร์ฟเวอร์ Backend บน Cloud (รัน 24 ชม.)

### ตัวเลือก 1.1: ใช้ Google Cloud Run (แนะนำ ฟรี 2 ล้านคำขอ/เดือน)
1. นำโค้ดขึ้น **GitHub** ของคุณ
2. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com/) > เลือกเมนู **Cloud Run**
3. กด **"Create Service"**
4. เลือก **"Continuously deploy from a repository"** แล้วเลือก GitHub Repository ของคุณ (ระบบตรวจพบ `Dockerfile` อัตโนมัติ)
5. ตั้งค่า:
   - **Service name:** `spotiquiz`
   - **Region:** `asia-southeast1` (Singapore เร็วสุดสำหรับไทย)
   - **Authentication:** ติ๊ก **"Allow unauthenticated invocations"**
   - **Container port:** `8080`
   - **Request timeout:** `3600` วินาที (60 นาที)
6. กด **Create** แล้วรอ 1-2 นาที คุณจะได้ URL ต้นทางของ Cloud Run เช่น:
   ```
   spotiquiz-xxxxxx-as.a.run.app
   ```

---

## ☁️ ขั้นตอนที่ 2: ตั้งค่า Subdomain บน Cloudflare DNS

1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/) > เลือกโดเมน `hxvapp.com`
2. ไปที่เมนู **DNS** > **Records** > กด **Add record**

### 2.1 เพิ่ม Record สำหรับ Backend WebSocket (`ws.hxvapp.com`):
* **Type:** `CNAME`
* **Name:** `ws` (จะได้โดเมนเต็มคือ `ws.hxvapp.com`)
* **Target:** ใส่ URL ของ Cloud Run (เช่น `spotiquiz-xxxxxx-as.a.run.app`) *(หรือถ้าใช้ VPS ให้ใส่ Type เป็น `A` แล้วใส่ IP เซิร์ฟเวอร์)*
* **Proxy status:** **Proxied (ก้อนเมฆสีส้ม)**
* กด **Save**

### 2.2 ตรวจสอบ Record สำหรับ Frontend (`jam.hxvapp.com`):
* **Type:** `CNAME`
* **Name:** `jam`
* **Target:** ชี้ไปยัง Firebase Hosting (เช่น `jam-music-ea669.web.app`)
* **Proxy status:** **Proxied (ก้อนเมฆสีส้ม)**

> [!NOTE]
> **Cloudflare รองรับ WebSocket อัตโนมัติ:** เมื่อเปิด Proxy (ก้อนเมฆสีส้ม) Cloudflare จะเข้ารหัส SSL/TLS และส่งผ่าน WebSocket พอร์ต 443 (`wss://`) ไปยัง Cloud Backend ให้เองโดยไม่มีค่าใช้จ่ายเพิ่มเติม

---

## ⚙️ ขั้นตอนที่ 3: กำหนดค่าใน `.env` และ Deploy Frontend

1. เปิดไฟล์ `.env` ในโปรเจกต์ SpotiQuiz ของคุณ
2. แก้ไขบรรทัด `VITE_WS_URL` ให้ชี้ไปที่ Subdomain ใหม่:
   ```bash
   VITE_WS_URL=wss://ws.hxvapp.com/ws
   ```
3. สั่ง Build และ Deploy หน้าเว็บขึ้น Firebase Hosting:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 🔑 ขั้นตอนที่ 4: เพิ่มโดเมนใน Firebase & Spotify

เพื่อให้ระบบล็อกอินไม่ขึ้น Error:

### 1. Firebase Authentication:
1. ไปที่ [Firebase Console](https://console.firebase.google.com/) > **Authentication** > **Settings**
2. เลื่อนลงมาที่ **Authorized domains** กด **Add domain** เพิ่ม:
   - `jam.hxvapp.com`
   - `ws.hxvapp.com`

### 2. Spotify Developer Dashboard:
1. ไปที่ [Spotify Dashboard](https://developer.spotify.com/dashboard) > เลือกแอปของคุณ > กด **Settings**
2. ในช่อง **Redirect URIs** ตรวจสอบว่ามี:
   - `https://jam.hxvapp.com/` *(อย่าลืมเครื่องหมาย `/` ท้ายสุด)*
3. กด **Save**

---

## 🎉 การทดสอบเมื่อตั้งค่าเสร็จสิ้น

1. เปิดเบราว์เซอร์ไปที่: `https://jam.hxvapp.com`
2. เข้าสู่ระบบด้วย Google, Spotify หรือ Guest
3. กด **"Create Room"**
4. หน้าจอจะแสดงรหัสห้อง (เช่น `SPOTI-1234`) ทันที โดยที่ตัวเบราว์เซอร์เชื่อมต่อ WebSocket ผ่าน `wss://ws.hxvapp.com/ws` แบบ 24 ชั่วโมง ไม่มี Error หลุดหรือตัดการเชื่อมต่ออีกต่อไป!
