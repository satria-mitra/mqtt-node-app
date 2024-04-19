const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mqtt = require('mqtt');

// Ensure Firebase is only initialized once
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase);
} else {
    admin.app();
}

exports.mqttListener = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    connectAndSubscribe();  // Your existing function to connect and subscribe to MQTT
});

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
            
                    // Access the values
                    const deviceId = msg.data[0].vals[0];  // "Device ID"
                    const date = msg.data[0].vals[1];      // "Date" formatted as YYYY-MM-DD
                    const time = msg.data[0].vals[2];      // "Time" formatted as HH:mm
                    const taAvg = msg.data[0].vals[6];     // "Temperature Average"
            
                    // Log the values
                    console.log(`Received: Device ID - ${deviceId}, Date - ${date}, Time - ${time}, TA_AVG - ${taAvg}`);
            
                    // Define the database reference path
                    const dbRef = admin.database().ref(`devices/${deviceId}/${date.replace(/-/g, '/')}/${time.replace(':', '-')}`);
            
                    // Check if data already exists at this location
                    dbRef.once('value', snapshot => {
                        if (!snapshot.exists()) {
                            // Store the data if it does not exist
                            dbRef.set({
                                temp: taAvg,
                            }).then(() => {
                                console.log('Data stored successfully in Realtime Database');
                            }).catch(error => {
                                console.error('Failed to store data in Realtime Database:', error);
                            });
                        } else {
                            console.log('Data already exists for this timestamp, skipping duplicate.');
                        }
                    });
            
                } catch(e) {
                    console.error('Error parsing message or extracting values:', e);
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
