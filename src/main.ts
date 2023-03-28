import { Interface } from "readline";
import * as streetService from "./israeliStreets";
import { cities } from "./israeliStreets";
import { produceMessage, closeProducerConnection } from "../rabbit/producer";
import { consumeMessage, closeConsumerConnection } from "../rabbit/consumer";
const readline = require("readline");

const rl: Interface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//In the main function we are checking if the input of the user is a city name or is it a street id.
//If it is a city name and it is valid and in the database we will produce all the streets that are
//relevent to the city.
//If it is a street id then we will check if the id is valid and produce the street with the id.
//input of 'exit' exit the process.
async function main() {
  while (true) {
    let userInput: string = await getInput("Enter a value: ");
    if (userInput.toLowerCase() === "exit") {
      await closeProducerConnection();
      await closeConsumerConnection();
      console.log("exiting...");
      break;
    }
    console.log(`You entered: ${userInput}`);
    if (!isNaN(Number(userInput))) {
      const resInputId = await inputIsTypeIdStreet(userInput);
      if (!resInputId) {
        continue;
      } else {
        console.log("Inserted succesfully to database.");
      }
    } else {
      const resInputCity = await inputIsTypeCity(userInput);
      if (!resInputCity) {
        continue;
      } else {
        console.log("Inserted succesfully to database.");
      }
    }
  }
  rl.close();
}
//This function takes care of the user input
function getInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (userInput: string) => {
      resolve(userInput);
    });
  });
}
//Function that changes to camalcase the input of the user so he can write his input however he wants.
//This needs to be done because the information about the city is given in the cities file in camalcase
function toCamelCase(str: string): string {
  // Split the string into words by any non-word characters
  const words = str.split(/[^a-zA-Z0-9]/);

  // Capitalize the first letter of each word
  for (let i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }

  // Join the words together with no separator and return the result
  return words.join(" ");
}

//Function that takes care of an input id type.
async function inputIsTypeIdStreet(input: string): Promise<boolean> {
  try {
    const street = await streetService.StreetsService.getStreetInfoById(
      Number(input)
    );
    await consumeMessage();
    await produceMessage(street);

    return true;
  } catch (err) {
    console.log(`There isn't an id street "${input}" in the database.`);
    return false;
  }
}
//Function that takes care of an input city type.
async function inputIsTypeCity(input: string): Promise<boolean> {
  const userInput = toCamelCase(input);
  if (!cities[`${userInput}`]) {
    console.log(`There isn't a city named "${userInput}" in the database.`);
    return false;
  }

  //This function needs to receive the name of the city in hebrew in order to filter the database
  //So it uses the cities object dictionary to convert
  const inputObject = await streetService.StreetsService.getStreetsInCity(
    cities[`${userInput}`]
  );
  const inputStreetsByCity = {
    city: inputObject.city,
    streets: inputObject.streets,
  };

  await consumeMessage();
  await produceMessage(inputStreetsByCity);

  return true;
}

main();
