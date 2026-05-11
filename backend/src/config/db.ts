import { Reservation } from "../entities/Reservation";
import { Article } from "../entities/Article";
import { Product } from "../entities/Product";
import { User } from "../entities/User";
import { DataSource } from "typeorm";
import { Contact } from "../entities/Contact";
import { Avis } from "../entities/Avis";
import { ClientMessage } from "../entities/ClientMessage";

export const db = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "example",
  database: process.env.DB_DATABASE || "postgres",
  synchronize: true,
  logging: ["error", "query"],
  entities: [Product, Article, User, Reservation, Contact, Avis, ClientMessage],
});

// import { DataSource } from "typeorm";

// import { Contact } from "../entities/Contact";
// import { Avis } from "../entities/Avis";

// export const db = new DataSource({
//   type: "sqlite",
//   database: "./countries.sqlite",
//   synchronize: true,
//   entities: [Contact, Avis],
// });
