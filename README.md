# MQTT Node Application with Google Functions Integration
This repository contains the MQTT Node Application integrated with Google Cloud Functions. It is designed to demonstrate how MQTT can be used along with serverless functions to build scalable and efficient applications.

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
What things you need to install the software and how to install them:

- Node.js
- npm (Node Package Manager)
- Google Cloud SDK
- An MQTT broker (like Mosquitto)
## Installing
A step by step series of examples that tell you how to get a development environment running:

Clone the repository:
```
git clone https://github.com/satria-mitra/mqtt-node-app.git
```

Navigate to the cloned directory:
```
cd mqtt-node-app
```
Install the required packages:
```
npm install
```
Setup your Google Cloud environment:
```
gcloud init
```
Deploy the Google Function:
```
gcloud functions deploy YourFunctionName --trigger-http --runtime nodejs10 --allow-unauthenticated
```
## Usage
How to use the application:

Start your local MQTT broker or connect to an existing broker.
Adjust the MQTT connection parameters in the index.js file as necessary.
Run the application:
sh
Copy code
node index.js
Trigger your Google Function via HTTP to interact with the MQTT application.


## Authors
Satria Utama
