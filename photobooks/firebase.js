// Import the functions you need from the SDKs you need
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
    // TODO: Add SDKs for Firebase products that you want to use
    // https://firebase.google.com/docs/web/setup#available-libraries

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyABOyYa9MKUmOoQsM-TLCYkN-Byxs1EBWg",
        authDomain: "landing-page-apresentacao-tea.firebaseapp.com",
        projectId: "landing-page-apresentacao-tea",
        storageBucket: "landing-page-apresentacao-tea.firebasestorage.app",
        messagingSenderId: "961888992706",
        appId: "1:961888992706:web:4f5e4f214b7cd62d0a6a5b",
        measurementId: "G-9RWDTPE231"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);