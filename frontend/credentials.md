### 1. PocketBase Administrative Access
This is the "Root" access used for managing the database, collections, and custom scripts.
- **Admin Panel URL (Local PC)**: [http://127.0.0.1:8090/_/](http://127.0.0.1:8090/_/)
- **Admin Panel URL (LAN)**: `http://YOUR_PC_LAN_IP:8090/_/`
- **Email/Identity**: admin@attendance.edu
- **Password**: adminpassword123

---

### 2. System Portals (Faculty & Students)
These credentials are used on the main login page of your React application.

#### **Faculty (Professors)**
| Professor Name | Email | Password | Session PIN |
| :--- | :--- | :--- | :--- |
| **Dr. Adrian Vale** | adrian.vale@futureacademy.edu | Professor@123 | 1300 |
| **Dr. Liana Frost** | liana.frost@futureacademy.edu | Professor@123 | 1301 |
| **Dr. Mira Quinn** | mira.quinn@futureacademy.edu | Professor@123 | 1302 |
| **Dr. Jonas Hale** | jonas.hale@futureacademy.edu | Professor@123 | 1303 |
| **Dr. Owen Vale** | owen.vale@futureacademy.edu | Professor@123 | 1304 |
| **Dr. Caleb Stone** | caleb.stone@futureacademy.edu | Professor@123 | 1305 |
| **Dr. Talia Monroe** | talia.monroe@futureacademy.edu | Professor@123 | 1306 |
| **Dr. Rowan Pierce** | rowan.pierce@futureacademy.edu | Professor@123 | 1307 |
| **Dr. Vera Hart** | vera.hart@futureacademy.edu | Professor@123 | 1308 |
| **Dr. Arman Blake** | arman.blake@futureacademy.edu | Professor@123 | 1309 |
| **Dr. Selma North** | selma.north@futureacademy.edu | Professor@123 | 1310 |
| **Dr. Felix Kline** | felix.kline@futureacademy.edu | Professor@123 | 1311 |
| **Eng. Rami Nash** | rami.nash@futureacademy.edu | Professor@123 | 1312 |
| **Eng. Talia Noor** | talia.noor@futureacademy.edu | Professor@123 | 1313 |
| **Eng. Aya Mercer** | aya.mercer@futureacademy.edu | Professor@123 | 1314 |
| **Eng. Nadia Hale** | nadia.hale@futureacademy.edu | Professor@123 | 1315 |
| **Eng. Lina Faris** | lina.faris@futureacademy.edu | Professor@123 | 1316 |
| **Eng. Omar Zane** | omar.zane@futureacademy.edu | Professor@123 | 1317 |
| **Eng. Hana Wren** | hana.wren@futureacademy.edu | Professor@123 | 1318 |
| **Eng. Mira Sol** | mira.sol@futureacademy.edu | Professor@123 | 1319 |
| **Eng. Jade Frost** | jade.frost@futureacademy.edu | Professor@123 | 1320 |
| **Dr. Celine Park** | celine.park@futureacademy.edu | Professor@123 | 1321 |
| **Eng. Kian Redd** | kian.redd@futureacademy.edu | Professor@123 | 1322 |

#### **Students**
| Student Name | Email | Password |
| :--- | :--- | :--- |
| **Mohamed Ahmed Ali** | mohamed.ahmed.ali@students.edu | Student@123 |
| **Sara Mohamed Hassan** | sara.mohamed.hassan@students.edu | Student@123 |
| **Youssef Khaled Ibrahim** | youssef.khaled.ibrahim@students.edu | Student@123 |
| **Nour El Din Mahmoud** | nour.el.din.mahmoud@students.edu | Student@123 |
| **Aya Abdelrahman** | aya.abdelrahman@students.edu | Student@123 |
| **Hassan Tarek Mostafa** | hassan.tarek.mostafa@students.edu | Student@123 |
| **Mariam Adel Fouad** | mariam.adel.fouad@students.edu | Student@123 |
| **Kareem Samir Fathy** | kareem.samir.fathy@students.edu | Student@123 |
| **Mahmoud Hany Saleh** | mahmoud.hany.saleh@students.edu | Student@123 |
| **Dina Magdy Fawzy** | dina.magdy.fawzy@students.edu | Student@123 |
| **Omar Tamer Abdelrahim** | omar.tamer.abdelrahim@students.edu | Student@123 |
| **Salma Nader Kamal** | salma.nader.kamal@students.edu | Student@123 |
| **Ali Reda Mohamed** | ali.reda.mohamed@students.edu | Student@123 |
| **Rana Wael Salah** | rana.wael.salah@students.edu | Student@123 |
| **Mostafa Adel Hassan** | mostafa.adel.hassan@students.edu | Student@123 |
| **Heba Khaled Samy** | heba.khaled.samy@students.edu | Student@123 |
| **Ahmed Saad Ibrahim** | ahmed.saad.ibrahim@students.edu | Student@123 |
| **Laila Emad Yassin** | laila.emad.yassin@students.edu | Student@123 |
| **Yara Mohamed Saber** | yara.mohamed.saber@students.edu | Student@123 |
| **Tarek Nabil Amin** | tarek.nabil.amin@students.edu | Student@123 |
| **Nada Alaa Farid** | nada.alaa.farid@students.edu | Student@123 |
| **Islam Hossam Ali** | islam.hossam.ali@students.edu | Student@123 |
| **Farah Tamer Emad** | farah.tamer.emad@students.edu | Student@123 |
| **Karim Wael Mostafa** | karim.wael.mostafa@students.edu | Student@123 |

---

### 3. Developer / Technical Details
- **JWT Secret**: smart-attendance-jwt-v1 (Used in backend hooks)
- **API Base URL**: Defaults to same-origin in development (`window.location.origin`) and can be overridden with `VITE_API_BASE_URL`
- **Frontend URL (Local PC)**: http://localhost:3000
- **Frontend URL (LAN)**: `http://YOUR_PC_LAN_IP:3000`
