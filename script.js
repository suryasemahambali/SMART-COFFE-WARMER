// --- Variabel State Utama ---
let suhuSekarang = 25.0; // Suhu ruang awal
let dayaPemanas = 0;     // Output PWM PID (0% - 100%)

// --- Parameter Kustom PID ---
let Kp = 2.5;
let Ki = 0.5;
let Kd = 1.2;

// Variabel kalkulasi internal PID
let errorSuhu = 0;
let lastErrorSuhu = 0;
let integralError = 0;
let derivativeError = 0;

let isAutoTuning = false;

// Elemen HTML Kontrol Utama
const setpointInput = document.getElementById('setpoint-input');
const suhuNilaiEl = document.getElementById('suhu-nilai');
const statusMesinEl = document.getElementById('status-mesin');
const loadValEl = document.getElementById('load-val');
const loadFillEl = document.getElementById('load-fill');
const logBox = document.getElementById('log-box');
const btnAutotune = document.getElementById('btn-autotune');

// Elemen HTML Input Manual PID
const kpInputEl = document.getElementById('kp-input');
const kiInputEl = document.getElementById('ki-input');
const kdInputEl = document.getElementById('kd-input');

// Elemen HTML untuk Gambar Visualisasi
const thermoBar = document.getElementById('thermo-bar');
const coffeeLiquid = document.getElementById('coffee-liquid');
const steamBox = document.getElementById('steam-box');

// --- 1. Fungsi Inti Loop Matematika & Visual PID ---
function updateSistemPID() {
    let setPoint = parseFloat(setpointInput.value) || 60;

    // Hitung Error saat ini
    errorSuhu = setPoint - suhuSekarang;

    // Hitung Komponen PID
    integralError += errorSuhu;
    integralError = Math.max(-50, Math.min(50, integralError)); // Limit windup
    
    derivativeError = errorSuhu - lastErrorSuhu;

    // Rumus PID
    let outputPID = (Kp * errorSuhu) + (Ki * integralError) + (Kd * derivativeError);

    // Pembatasan Daya Pemanas PWM (0% - 100%)
    dayaPemanas = Math.max(0, Math.min(100, outputPID));

    // --- Efek Fisika Termal Termodinamika ---
    if (dayaPemanas > 0) {
        suhuSekarang += (dayaPemanas * 0.02); 
    }
    suhuSekarang -= 0.1; // Kalor dingin alami ruangan

    lastErrorSuhu = errorSuhu;

    // --- UPDATE TEXT & STATUS DASHBOARD ---
    suhuNilaiEl.innerText = suhuSekarang.toFixed(1);
    loadValEl.innerText = Math.round(dayaPemanas);
    loadFillEl.style.width = `${dayaPemanas}%`;

    if (Math.abs(errorSuhu) < 0.5) {
        statusMesinEl.innerText = "Suhu Stabil (PID Lock)";
        statusMesinEl.style.background = "#e5fbe5";
        statusMesinEl.style.color = "#2ecc71";
    } else if (errorSuhu > 0) {
        statusMesinEl.innerText = "Mengejar Set Point...";
        statusMesinEl.style.background = "#ffe5e5";
        statusMesinEl.style.color = "#ff4d4d";
    } else {
        statusMesinEl.innerText = "Suhu Berlebih (Mendinginkan)";
        statusMesinEl.style.background = "#eef2f7";
        statusMesinEl.style.color = "#3498db";
    }

    // --- UPDATE MANIPULASI GAMBAR INTERAKTIF (CANGKIR & THERMO) ---
    let tinggiPersen = Math.min(100, Math.max(5, suhuSekarang));
    thermoBar.style.height = `${tinggiPersen}%`;

    if (suhuSekarang < 45) {
        coffeeLiquid.style.background = "#2b1d14"; 
        steamBox.style.visibility = "hidden"; 
    } 
    else if (suhuSekarang >= 45 && suhuSekarang < 60) {
        coffeeLiquid.style.background = "#5c3a21"; 
        steamBox.style.visibility = "visible";
        document.querySelectorAll('.steam').forEach(s => s.style.animationDuration = '2.0s');
    } 
    else if (suhuSekarang >= 60 && suhuSekarang <= 75) {
        coffeeLiquid.style.background = "#a0522d"; 
        steamBox.style.visibility = "visible";
        document.querySelectorAll('.steam').forEach(s => s.style.animationDuration = '1.2s');
    } 
    else {
        coffeeLiquid.style.background = "#ff4500"; 
        steamBox.style.visibility = "visible";
        document.querySelectorAll('.steam').forEach(s => s.style.animationDuration = '0.5s');
    }
}

// --- 2. Fungsi Ambil Input Parameter Manual ---
function updateParameterManual() {
    Kp = parseFloat(kpInputEl.value) || 0;
    Ki = parseFloat(kiInputEl.value) || 0;
    Kd = parseFloat(kdInputEl.value) || 0;
    tambahLog(`[PID UPDATE] Parameter diubah manual -> Kp: ${Kp}, Ki: ${Ki}, Kd: ${Kd}`);
}

// --- 3. Fungsi Auto-Tuning PID ---
function mulaiAutoTune() {
    if (isAutoTuning) return;
    isAutoTuning = true;
    
    // UBAH WARNA DAN TEKS TOMBOL JADI AKTIF TUNING
    btnAutotune.innerText = "⏳ Proses Tuning...";
    btnAutotune.classList.add('tuning-active');
    tambahLog("[AUTOTUNE] Memulai kalkulasi otomatisasi respon termal kopi...");

    let counter = 0;
    let tuneInterval = setInterval(() => {
        counter++;
        if (counter >= 3) {
            clearInterval(tuneInterval);
            
            let sp = parseFloat(setpointInput.value);
            Kp = (sp * 0.08).toFixed(2);
            Ki = (sp * 0.005).toFixed(2);
            Kd = (sp * 0.02).toFixed(2);

            // Perbarui nilai di kotak input manual secara otomatis
            kpInputEl.value = Kp;
            kiInputEl.value = Ki;
            kdInputEl.value = Kd;

            tambahLog(`[AUTOTUNE BERHASIL] Didapatkan parameter stabil -> Kp: ${Kp}, Ki: ${Ki}, Kd: ${Kd}`);
            
            // KEMBALIKAN WARNA TOMBOL KE NORMAL
            btnAutotune.innerText = "⚙️ Jalankan Auto-Tuning PID";
            btnAutotune.classList.remove('tuning-active');
            isAutoTuning = false;
        }
    }, 1000);
}

// --- 4. Fungsi Tambahan Interaktif ---
function tambahGangguan(nilai) {
    suhuSekarang += nilai;
    tambahLog(`[DISTURBANCE] Suhu kopi berubah mendadak akibat intervensi luar: ${nilai}°C`);
}

function tambahLog(pesan) {
    const waktu = new Date().toLocaleTimeString('id-ID');
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerText = `[${waktu}] ${pesan}`;
    logBox.appendChild(logItem);
    logBox.scrollTop = logBox.scrollHeight;
}

// Loop Sistem Berkelanjutan (Setiap 200 milidetik)
setInterval(() => {
    if (!isAutoTuning) {
        updateSistemPID();
    }
}, 200);