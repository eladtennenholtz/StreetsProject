import * as rb from "amqplib"; //Import the amqplib module, which provides the RabbitMQ client.
import { MongoClient } from "mongodb"; //Import the MongoClient class from the mongodb module.

const aMqpUrl: string = process.env.AMQP_URL || "amqp://localhost:5672";
const mongoUrl: string =
  process.env.MONGO_URL || "mongodb://localhost:27017/mydb";
let [connection, channel, queue, client, db, collection] = [
  null,
  null,
  null,
  null,
  null,
  null,
];

//This function which will be used to consume messages from the RabbitMQ queue(if there is a message. if there
//isnt it wil receive null).
async function processMessage(msg): Promise<void> {
  if (!msg) return;
  //Parse the message payload (which is assumed to be JSON) into a TypeScript object
  const data = JSON.parse(msg.content.toString());

  //Connect to the MongoDB server
  if (!client) {
    client = await MongoClient.connect(mongoUrl, {});
    //Get a reference to the database
    db = client.db();
    collection = db.collection("allstreets");
  }
  try {
    //Insert the data into the users collection
    await collection.insertOne(data);

    //console.log("Inserted document into the collection");
  } catch (err) {
    //  console.error(`Error inserting document into MongoDB: ${err}`);
  }
}
async function consumeMessage() {
  if (!connection) {
    connection = await rb.connect(aMqpUrl, "heartbeat=60");
    channel = await connection.createChannel();
    channel.prefetch(10); // channel will only receive 10 messages at a time.
    queue = "cityStreetsQueue"; //Define the name of the queue that we will consume from.
    //Assert that the queue exists, with durable set to true.
    await channel.assertQueue(queue, { durable: true });
  }

  //start consuming messages from the queue.
  //processMessage is a callback function that will be called when a message is received.
  //noAck option is set to false to ensure that messages are acknowledged.

  await channel.consume(
    queue,
    async (msg) => {
      await processMessage(msg);
      await channel.ack(msg);
    },
    {
      noAck: false,
    }
  );
}
//Closes all the connections to the services
async function closeConsumerConnection() {
  if (!channel) {
    return;
  }
  await channel.close();
  await connection.close();
  await client.close();
}

export { consumeMessage, closeConsumerConnection };
