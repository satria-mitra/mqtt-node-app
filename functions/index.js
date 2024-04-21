const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mqtt = require('mqtt');
admin.initializeApp();

let mqttClient = null;
let subscribedTopics = new Set();  // Keep track of subscribed topics to avoid duplicates

async function setupMqttClient() {
    const brokerConfigSnapshot = await admin.firestore().collection('brokers').get();
    if (brokerConfigSnapshot.empty) {
        console.log('No broker configuration found.');
        return;
    }

    const brokerConfig = brokerConfigSnapshot.docs[0].data();
    console.log(`Attempting to connect to MQTT Broker: ${brokerConfig.host}`);

    mqttClient = mqtt.connect(`mqtt://${brokerConfig.host}:${brokerConfig.port}`, {
        username: brokerConfig.username,
        password: brokerConfig.password
    });

    mqttClient.on('connect', () => {
        console.log(`Connected to MQTT Broker: ${brokerConfig.host}`);
        refreshSubscriptions();  // Refresh and subscribe to topics on connect
    });

    mqttClient.on('message', (topic, message) => {
        processMessage(topic, message);
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT Connection error:', err);
    });

    mqttClient.on('close', () => {
        console.log('MQTT connection closed. Attempting to reconnect...');
        setupMqttClient();
    });
}

async function refreshSubscriptions() {
    const devicesSnapshot = await admin.firestore().collection('devices').get();
    devicesSnapshot.docs.forEach(doc => {
        const deviceConfig = doc.data();
        const topic = deviceConfig.topic;
        if (!subscribedTopics.has(topic)) {
            console.log(`Subscribing to new topic: ${topic}`);
            mqttClient.subscribe(topic, (err) => {
                if (!err) {
                    subscribedTopics.add(topic);
                    console.log(`Successfully subscribed to ${topic}`);
                } else {
                    console.error(`Subscription error on topic ${topic}:`, err);
                }
            });
        }
    });
}

function processMessage(topic, message) {
    try {
        const msg = JSON.parse(message.toString());
        const deviceId = msg.data[0].vals[0];
        const date = msg.data[0].vals[1].replace(/\//g, '-');
        const time = msg.data[0].vals[2].replace(/:/g, '-');
        const taAvg = msg.data[0].vals[6];
        const rhAvg = msg.data[0].vals[9];

        console.log(`Storing data for ${topic}: Device ID - ${deviceId}, Date - ${date}, Time - ${time}, TA_AVG - ${taAvg}, RH_AVG - ${rhAvg}`);
        
        const ref = admin.database().ref(`devices/${deviceId}/${date}/${time}`);
        ref.set({
            temp_avg: taAvg,
            rh_avg: rhAvg
        });
        
    } catch (e) {
        console.error('Error processing message:', e);
    }
}

exports.mqttListener = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    if (!mqttClient || !mqttClient.connected) {
        console.log('MQTT client not connected, setting up...');
        await setupMqttClient();
    } else {
        console.log('MQTT client already connected, refreshing subscriptions...');
        await refreshSubscriptions();
    }
});

