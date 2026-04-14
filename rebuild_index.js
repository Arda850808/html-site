const fs = require('fs');

// Read the original clean file
let html = fs.readFileSync('index_original.html', 'utf8');

// === STEP 1: Fix tab buttons to pass 'this' ===
html = html.replace(
    `onclick="switchTab('login')"`,
    `onclick="switchTab('login', this)"`
);
html = html.replace(
    `onclick="switchTab('register')"`,
    `onclick="switchTab('register', this)"`
);

// === STEP 2: Replace the old <script> with Firebase module + plain switchTab ===
// Find where the script starts
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>') + '</script>'.length;

if (scriptStart === -1 || scriptEnd === -1) {
    console.log("ERROR: Could not find script tags");
    process.exit(1);
}

const beforeScript = html.substring(0, scriptStart);
const afterScript = html.substring(scriptEnd);

const newScript = `<script>
        // switchTab must be in a plain script (NOT a module) so it loads synchronously
        function switchTab(tabName, btnEl) {
            document.querySelectorAll('.tab-content').forEach(function(tab) {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(function(btn) {
                btn.classList.remove('active');
            });
            var el = document.getElementById(tabName);
            if (el) el.classList.add('active');
            if (btnEl) btnEl.classList.add('active');
        }
    </script>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDrMEPFlUnZYro2ygYjNWb_n1VIN51v9sU",
            authDomain: "nexusos-9c84d.firebaseapp.com",
            projectId: "nexusos-9c84d",
            storageBucket: "nexusos-9c84d.firebasestorage.app",
            messagingSenderId: "165113413087",
            appId: "1:165113413087:web:0e39e1e2bcc19e3759d86a"
        };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        const ADMIN_USERNAME = 'Arda';

        function normalizeUsername(username) {
            return String(username || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().normalize('NFKC').toLocaleLowerCase('tr-TR');
        }

        function getEmail(username) {
            const clean = normalizeUsername(username).replace(/[^a-z0-9]/g, '');
            return (clean || 'user') + '@nexusos.com';
        }

        function setSession(username, isAdmin) {
            sessionStorage.setItem('nexusOS_loggedUser', username);
            sessionStorage.setItem('nexusOS_isAdmin', isAdmin ? '1' : '0');
            localStorage.setItem('nexusOS_loggedUser', username);
            localStorage.setItem('nexusOS_isAdmin', isAdmin ? '1' : '0');
            localStorage.setItem('nexusOS_loginTime', new Date().toLocaleString('tr-TR'));
            localStorage.setItem('nexusOS_loginTimestamp', Date.now().toString());
        }

        function showMsg(id, msg) {
            var el = document.getElementById(id);
            if (el) { el.textContent = msg; el.style.display = 'block'; }
        }
        function hideMsg(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        }

        // === LOGIN ===
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            hideMsg('errorMessage'); hideMsg('successMessage');

            var username = document.getElementById('username').value.trim();
            var password = document.getElementById('password').value;
            var rememberMe = document.getElementById('rememberMe').checked;

            if (!username || !password) { showMsg('errorMessage', 'Lütfen tüm alanları doldurunuz!'); return; }

            var btn = this.querySelector('.login-btn');
            var orig = btn.textContent;
            btn.textContent = 'Bağlanıyor...'; btn.disabled = true;

            try {
                await signInWithEmailAndPassword(auth, getEmail(username), password);
                showMsg('successMessage', 'Giriş başarılı! Yönlendiriliyorsunuz...');
                var isAdmin = normalizeUsername(username) === normalizeUsername(ADMIN_USERNAME);
                setSession(username, isAdmin);
                if (rememberMe) {
                    localStorage.setItem('nexusOS_remembered_user', username);
                    localStorage.setItem('nexusOS_remembered_pass', password);
                } else {
                    localStorage.removeItem('nexusOS_remembered_user');
                    localStorage.removeItem('nexusOS_remembered_pass');
                }
                setTimeout(function() { window.location.href = 'dashboard/home.html'; }, 1500);
            } catch(err) {
                console.error(err);
                showMsg('errorMessage', 'Kullanıcı adı veya şifre hatalı!');
                document.getElementById('password').value = '';
                btn.textContent = orig; btn.disabled = false;
            }
        });

        // === REGISTER ===
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            hideMsg('regErrorMessage'); hideMsg('regSuccessMessage');

            var username = document.getElementById('regUsername').value.trim();
            var password = document.getElementById('regPassword').value;
            var passConfirm = document.getElementById('regPasswordConfirm').value;

            if (!username || !password || !passConfirm) { showMsg('regErrorMessage', 'Lütfen tüm alanları doldurunuz!'); return; }
            if (username.length < 3) { showMsg('regErrorMessage', 'Kullanıcı adı en az 3 karakter olmalıdır!'); return; }
            if (password.length < 6) { showMsg('regErrorMessage', 'Şifre en az 6 karakter olmalıdır!'); return; }
            if (password !== passConfirm) { showMsg('regErrorMessage', 'Şifreler eşleşmiyor!'); return; }

            var btn = this.querySelector('.login-btn');
            var orig = btn.textContent;
            btn.textContent = 'Hesap Oluşturuluyor...'; btn.disabled = true;

            try {
                await createUserWithEmailAndPassword(auth, getEmail(username), password);
                showMsg('regSuccessMessage', '✓ Kayıt başarılı! Giriş sekmesine geçin.');
                this.reset();
                btn.textContent = orig; btn.disabled = false;
                setTimeout(function() {
                    switchTab('login', document.querySelector('[onclick*="switchTab(\\'login\\'"]'));
                    document.getElementById('username').value = username;
                }, 2000);
            } catch(err) {
                console.error(err);
                btn.textContent = orig; btn.disabled = false;
                if (err.code === 'auth/email-already-in-use') {
                    showMsg('regErrorMessage', '"' + username + '" ismi zaten kullanımda!');
                } else {
                    showMsg('regErrorMessage', 'Hata: ' + err.message);
                }
            }
        });

        // === AUTO-FILL remembered login ===
        window.addEventListener('load', function() {
            var u = localStorage.getItem('nexusOS_remembered_user');
            var p = localStorage.getItem('nexusOS_remembered_pass');
            if (u && p) {
                document.getElementById('username').value = u;
                document.getElementById('password').value = p;
                document.getElementById('rememberMe').checked = true;
            }
        });
    </script>`;

html = beforeScript + newScript + afterScript;

fs.writeFileSync('index.html', html);
console.log("SUCCESS: index.html rebuilt cleanly.");
console.log("Lines:", html.split('\n').length);
