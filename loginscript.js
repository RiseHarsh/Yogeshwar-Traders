document.addEventListener("DOMContentLoaded", async function () {
    console.log("Page Loaded. Initializing Firebase...");

    async function loadEnv() {
        try {
            const response = await fetch('./env.json'); // ✅ Fetch env.json
            const env = await response.json();
            return env;
        } catch (error) {
            console.error("Error loading env.json:", error);
            return null;
        }
    }

    loadEnv().then(env => {
        if (!env) return;

        // ✅ Firebase Initialization
        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY,
            authDomain: env.FIREBASE_AUTH_DOMAIN,
            projectId: env.FIREBASE_PROJECT_ID,
            storageBucket: env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
            appId: env.FIREBASE_APP_ID,
            measurementId: env.FIREBASE_MEASUREMENT_ID
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();

        // ✅ Login Functionality
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('email');
            const password = document.getElementById('password');
            const errorMessage = document.getElementById('errorMessage');

            try {
                await auth.signInWithEmailAndPassword(email.value, password.value);
                window.location.href = 'dashboard.html';
            
            } catch (error) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = error.message;
            
                // ✅ Error Border + Shake Effect
                email.classList.add('shake', 'error');
                password.classList.add('shake', 'error');
            
                setTimeout(() => {
                    email.classList.remove('shake');
                    password.classList.remove('shake');
                }, 300);
            }
            
        });

    });
});
