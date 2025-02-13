// // firebase-messaging-sw.js

// importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
// importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js');

// // Initialiser Firebase dans le service worker
// firebase.initializeApp({
//     apiKey: "AIzaSyDwRreHnfABpGF2x6tN4wHe6VZUE_nRun4",
//     appId: "1:143091903095:web:bb74bfa8ca7d41120a7472",
//     projectId: "stanjapap",
//     messagingSenderId: "143091903095",
//     authDomain: "stanjapap.firebaseapp.com"
// });

// // Récupérer un message en arrière-plan
// const messaging = firebase.messaging();

// // Cette fonction gère les notifications reçues en arrière-plan
// messaging.onBackgroundMessage(function(payload) {
//   console.log("Message reçu en arrière-plan ", payload);
//   // Personnalise la notification ici (par exemple, avec un titre et un corps)
//   // const notificationTitle = "Titre de la notification";
//   // const notificationOptions = {
//   //   body: "Corps de la notification",
//   //   icon: "/icon.png",
//   // };

//   // self.registration.showNotification(notificationTitle, notificationOptions);
// });
