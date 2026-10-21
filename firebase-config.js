```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";

  const firebaseConfig = {
    apiKey: "AIzaSyC_6hsTPW8Qci-TiomgRdotH8mCZC8sj_0",
    authDomain: "confortstudy-9ab7d.firebaseapp.com",
    projectId: "confortstudy-9ab7d",
    storageBucket: "confortstudy-9ab7d.firebasestorage.app",
    messagingSenderId: "244422896752",
    appId: "1:244422896752:web:225917a55e4617091ad8b5",
    measurementId: "G-HYGZH21M65"
  };

  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
```