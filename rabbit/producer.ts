import * as rb from "amqplib"; //Node.js client for RabbitMQ.
const amqpUrl = process.env.AMQP_URL || "amqp://localhost:5672"; //Define the AMQP URL to use for connecting to RabbitMQ.
let [connection, channel, queue, exchange, routingKey] = [
  null,
  null,
  null,
  null,
  null,
];

async function produceMessage(msg) {
  if (!connection) {
    connection = await rb.connect(amqpUrl, "heartbeat=60"); //Connect to RabbitMQ using the amqpUrl and set a heartbeat of 60 seconds.
    channel = await connection.createChannel(); //Create a channel on the connection
    //Define the exchange name, queue name, and routing key for the message.
    exchange = "cityStreetsExchange";
    queue = "cityStreetsQueue";
    routingKey = "cityStreetsKey";
    //Assert the existence of the exchange and queue on the channel, and bind the queue to the exchange with the specified routing key.
    //The { durable: true } options ensure that the exchange and queue will survive a broker restart.
    await channel.assertExchange(exchange, "direct", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);
  }
  try {
    //Publish the message to the exchange with the specified routing key.
    // The message payload is the JSON-serialized version of the msg object.
    await channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(msg))
    );
  } catch (e) {
    //console.error("Error in publishing message", e);
  }
}
//Closes all the connections to the services
async function closeProducerConnection() {
  if (!channel) {
    return;
  }
  await channel.close();
  await connection.close();
}
export { produceMessage, closeProducerConnection };
