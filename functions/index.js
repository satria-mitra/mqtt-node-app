const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mqtt = require('mqtt');
admin.initializeApp();

let mqttClient = null;

async function setupMqttClient() {
    const mqttBrokersSnapshot = await admin.firestore().collection('mqttBrokers').get();
    if (mqttBrokersSnapshot.empty) {
        console.log('No MQTT configuration found.');
        return;
    }

    const mqttConfig = mqttBrokersSnapshot.docs[0].data();
    console.log(`Attempting to connect to MQTT Broker: ${mqttConfig.host} with topic ${mqttConfig.topic}`);
    
    mqttClient = mqtt.connect(`mqtt://${mqttConfig.host}:${mqttConfig.port}`, {
        username: mqttConfig.username,
        password: mqttConfig.password
    });

    mqttClient.on('connect', () => {
        console.log(`Connected to MQTT Broker: ${mqttConfig.host}`);
        mqttClient.subscribe(mqttConfig.topic, (err) => {
            if (!err) {
                console.log(`Subscribed to topic: ${mqttConfig.topic}`);
            } else {
                console.error(`Subscription error: ${err}`);
            }
        });
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const msg = JSON.parse(message.toString());
    
            const deviceId = msg.data[0].vals[0];  // "Device ID"
            const date = msg.data[0].vals[1].replace(/\//g, '-');  // "Date" formatted as YYYY-MM-DD
            const time = msg.data[0].vals[2].replace(/:/g, '-');   // "Time" formatted as HH-mm
            const taAvg = msg.data[0].vals[6];     // Temperature Average
            const rhAvg = msg.data[0].vals[9];     // Relative Humidity Average
    
            // Log the values to be stored
            console.log(`Storing data: Device ID - ${deviceId}, Date - ${date}, Time - ${time}, TA_AVG - ${taAvg}, RH_AVG - ${rhAvg}`);
    
            // Reference to the specific location in the Firebase Realtime Database
            const ref = admin.database().ref(`devices/${deviceId}/${date}/${time}`);
            ref.set({
                temp_avg: taAvg,
                rh_avg: rhAvg
            }).then(() => {
                console.log('Data stored successfully in Firebase RTDB');
            }).catch((error) => {
                console.error('Failed to store data in Firebase RTDB:', error);
            });
    
        } catch (e) {
            console.error('Error parsing message or extracting values:', e);
        }
    });
    

    mqttClient.on('error', (err) => {
        console.error('MQTT Connection error:', err);
    });

    mqttClient.on('close', () => {
        console.log('MQTT connection closed. Attempting to reconnect...');
        setupMqttClient();
    });
}

exports.mqttListener = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    if (!mqttClient || !mqttClient.connected) {
        console.log('MQTT client not connected or not set up, attempting to setup...');
        setupMqttClient();
    } else {
        console.log('MQTT client already connected.');
    }
});
