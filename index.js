const admin = require('firebase-admin');
const serviceAccount = require('weathershare-57c93-firebase-adminsdk-aezjd-09356ce536.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();