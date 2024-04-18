const admin = require('firebase-admin');
const serviceAccount = require('./weathershare-57c93-firebase-adminsdk-aezjd-09356ce536.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://weathershare-57c93-default-rtdb.firebaseio.com", // replace "your-project-id" with your actual project ID
});

const db = admin.firestore();

//mqtt 
const mqtt = require('mqtt');

function connectAndSubscribe() {
    admin.firestore().collection('mqttBrokers').get().then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const client = mqtt.connect(`mqtt://${data.host}:${data.port}`, {
          username: data.username,
          password: data.password
        });
  
        client.on('connect', () => {
          console.log(`Connected to MQTT Broker: ${data.host}`);
          client.subscribe(data.topic, (err) => {
            if (!err) {
              console.log(`Subscribed to topic: ${data.topic}`);
            } else {
              console.error(`Could not subscribe to topic: ${data.topic}`, err);
            }
          });
        });
  
        client.on('message', (topic, message) => {
          try {
            // Parse the incoming message as JSON
            const msg = JSON.parse(message.toString());
  
            // Access the TA_AVG value
            const taAvg = msg.data[0].vals[6]; // Index 6 for TA_AVG
            console.log(`Temperature Average (TA_AVG) received: ${taAvg}`);
          } catch(e) {
            console.error('Error parsing message or extracting TA_AVG:', e);
          }
        });
  
        client.on('error', (err) => {
          console.error('Connection error: ', err);
          client.end();
        });
      });
    }).catch(error => {
      console.error("Error fetching broker configurations: ", error);
    });
  }
  
  connectAndSubscribe();