import { buildSchema } from "type-graphql";
import ContactResolver from "./resolvers/ContactResolver";
import AvisResolver from "./resolvers/AvisResolver";

export default buildSchema({
  resolvers: [ContactResolver, AvisResolver],
});
