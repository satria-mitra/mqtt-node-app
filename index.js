const admin = require('firebase-admin');
const serviceAccount = require('weathershare-57c93-firebase-adminsdk-aezjd-09356ce536.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://weathershare-57c93-default-rtdb.firebaseio.com", // replace "your-project-id" with your actual project ID
});

const db = admin.firestore();