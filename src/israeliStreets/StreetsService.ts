import axios, { Axios } from "axios";
import { omit } from "lodash";
import { cities, city, enlishNameByCity } from "./cities";

//Makes a new interface which extends from ApiStreet interface (that is mentioend bellow) and using the Omit function
//(this was received from Lodash package) that ommits a property from the ApiStreet named '_id' and adds a
//'streedId' property. so the interface Street is the same interface like ApiStreet just instead of the '_id'
//property that ApiStreet has it has a 'streetId'.
export interface Street extends Omit<ApiStreet, "_id"> {
  streetId: number;
}

interface ApiStreet {
  _id: number;
  region_code: number;
  region_name: string;
  city_code: number;
  city_name: string;
  street_code: number;
  street_name: string;
  street_name_status: string;
  official_code: number;
}

export class StreetsService {
  private static _axios: Axios;
  private static get axios() {
    //This get function ensures that Axios is a singelton.That meens that it ensures that there is only
    //one instance of 'Axios' for the entire application.
    if (!this._axios) {
      this._axios = axios.create({});
    }
    return this._axios;
  }

  //The 'Pick' utlity type is used to create a new type from an existing type by selecting only certain
  //properties of the original type. In this case, it is used to select only the "streetId" and "street_name"
  // properties of the 'Street' interface or type.
  //This function recieves a name of a city and returns an object with the name of the city and an array of
  //all the streets in that city(each street returns with the data that is relevent for it).
  static async getStreetsInCity(city: city): Promise<{
    city: city;
    streets: Pick<Street, "streetId" | "street_name">[];
  }> {
    const res = (
      await this.axios.post(
        "https://data.gov.il/api/3/action/datastore_search",
        {
          resource_id: `1b14e41c-85b3-4c21-bdce-9fe48185ffca`,
          filters: { city_name: city }, // This is the filter for that we are looking in the data.
          //specificly here we are filtering with the city name. in the second function (getStreetsInfoById)
          //we are filtering by the id.
          limit: 100000, //100000
        }
      )
    ).data;

    const results = res.result.records;

    if (!results || !results.length) {
      throw new Error("No streets found for city: " + city);
    }

    //Takes only the relevent data that I need from the street data.
    //It maps over all the relevent streets and makes on new array of the streets that are relevent to the city
    //that was chosen an creates a new street array that has only 3 properties:
    //1. streetId 2. street name 3.street name status
    const streets: Pick<Street, "streetId" | "street_name">[] = results.map(
      (street: ApiStreet) => {
        return {
          streetId: street._id,
          name: street.street_name.trim(),
          status: street.street_name_status.trim(),
        };
      }
    );
    return { city, streets };
  }

  //We are receiving an id of the street and we are returning the data of a specific street
  static async getStreetInfoById(id: number) {
    const res = (
      await this.axios.post(
        "https://data.gov.il/api/3/action/datastore_search",
        {
          resource_id: `1b14e41c-85b3-4c21-bdce-9fe48185ffca`,
          filters: { _id: id },
          limit: 1,
        }
      )
    ).data;
    const results = res.result.records;
    if (!results || !results.length) {
      throw new Error("No street found for id: " + id);
    }
    const dbStreet: ApiStreet = results[0];
    const cityName = enlishNameByCity[dbStreet.city_name];
    const street: Street = {
      ...omit<ApiStreet>(dbStreet, "_id"),
      streetId: dbStreet._id,
      city_name: cityName,
      region_name: dbStreet.region_name.trim(),
      street_name: dbStreet.street_name.trim(),
    };
    return street;
  }
}
