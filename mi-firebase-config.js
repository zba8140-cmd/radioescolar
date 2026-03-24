
// configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCoXMvdLcnxiQ-tUGtLgcd7ilw321tdz9U",
  authDomain: "radio-escolar-721ab.firebaseapp.com",
  projectId: "radio-escolar-721ab",
  storageBucket: "radio-escolar-721ab.firebasestorage.app",
  messagingSenderId: "226260315216",
  appId: "1:226260315216:web:3126932ded5018af84f555"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const rtdb = firebase.database();

const programsCollection = db.collection('programs');
const songsCollection = db.collection('songs');
const scheduleCollection = db.collection('schedule');
const liveStatusDoc = db.collection('liveStatus').doc('current');
const chatCollection = db.collection('chatMessages');
const blogCollection = db.collection('blogPosts');

console.log(' Firebase inicializado correctamente');