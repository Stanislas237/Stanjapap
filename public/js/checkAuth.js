import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Utilisateur connecté:", user.uid);
  } else {
    console.log("Utilisateur non connecté.");
    window.location.href = "/";
  }
});