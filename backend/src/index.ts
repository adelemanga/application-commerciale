import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { db } from "../src/config/db";
import { buildSchema } from "type-graphql";
import ProductResolver from "./resolvers/ProductResolver";
import ArticleResolver from "../src/resolvers/ArticleResolver";
import UserResolver from "./resolvers/UserResolver";
import setCookieParser from "set-cookie-parser";
import jwt from "jsonwebtoken";
import ReservationResolver from "./resolvers/ReservationResolver";
import ContactResolver from "./resolvers/ContactResolver";
import AvisResolver from "./resolvers/AvisResolver";
import express from "express";
import http from "http";
import cors from "cors";

export type Context = {
  id: string;
  email: string;
  role: "Admin" | "User";
};

const start = async () => {
  await db.initialize();
  const schema = await buildSchema({
    resolvers: [
      ProductResolver,
      ArticleResolver,
      UserResolver,
      ReservationResolver,
      ContactResolver,
      AvisResolver,
    ],
    authChecker: ({ context }: { context: Context }, roles) => {
      console.log("roles for this query/mutation ", roles);
      if (!context.email) {
        return false;
      }

      if (roles.length === 0) {
        return true;
      }

      if (roles.includes(context.role)) {
        return true;
      } else {
        return false;
      }
    },
  });

  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  const allowedOrigins =
    process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001";

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({
      origin: allowedOrigins.split(","),
      credentials: true,
    }),
    express.json({ limit: "2mb" }),
    expressMiddleware(server, {
    context: async ({ req, res }) => {
      if (process.env.JWT_SECRET_KEY === undefined) {
        throw new Error("NO JWT SECRET KEY CONFIGURED");
      }
      const cookies = setCookieParser.parse(req.headers.cookie ?? "", {
        map: true,
      });

      if (cookies.token && cookies.token.value) {
        try {
          const payload = jwt.verify(
            cookies.token.value,
            process.env.JWT_SECRET_KEY
          ) as jwt.JwtPayload;
          if (payload) {
            return { ...payload, res: res };
          }
        } catch {
          res.setHeader(
            "Set-Cookie",
            "token=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/"
          );
        }
      }
      return {
        res: res,
      };
    },
    })
  );

  const port = Number(process.env.PORT) || 4004;
  await new Promise<void>((resolve) =>
    httpServer.listen({ port, host: "0.0.0.0" }, resolve)
  );

  console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
};

start();

// import "reflect-metadata";
// import express from "express";
// import http from "http";
// import cors from "cors";
// import "reflect-metadata";
// import { ApolloServer } from "@apollo/server";
// import { expressMiddleware } from "@apollo/server/express4";
// import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
// import { db } from "./db";
// import schemaPromise from "./schema";

// const port = process.env.PORT || 4003;

// const allowedOrigins =
//   process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000";

// schemaPromise.then(async (schema) => {
//   await db.initialize();
//   const app = express();
//   const httpServer = http.createServer(app);
//   const plugins = [ApolloServerPluginDrainHttpServer({ httpServer })];
//   const server = new ApolloServer({ schema, plugins });
//   await server.start();
//   const corsConfig = { origin: allowedOrigins.split(","), credentials: true };
//   app.use(cors<cors.CorsRequest>(corsConfig));
//   const context = async ({ req, res }: any) => ({ req, res });
//   const expressMW = expressMiddleware(server, { context });
//   app.use("/graphql", express.json(), expressMW);
//   await new Promise<void>((resolve) =>
//     httpServer.listen({ port, host: "0.0.0.0" }, resolve)
//   );
//   console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
// });
