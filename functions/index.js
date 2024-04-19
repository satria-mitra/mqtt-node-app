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
        console.log(`Received message on ${topic}:`, message.toString());
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
