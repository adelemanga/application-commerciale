import {
  Arg,
  Authorized,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import { db } from "../config/db";
import { Avis } from "../entities/Avis";

@InputType()
class NewAvisInput implements Partial<Avis> {
  @Field()
  name: string;

  @Field()
  lastname: string;

  @Field()
  message: string;

  @Field()
  rating: number;

  @Field()
  title: string;
}

@Resolver(Avis)
class AvisResolver {
  @Query(() => [Avis])
  async getAllAvis() {
    const avis = await Avis.find();
    return avis;
  }

  @Mutation(() => Avis)
  async addAvis(
    @Arg("name") name: string,
    @Arg("lastname") lastname: string,
    @Arg("message") message: string,
    @Arg("imgUrl") imgUrl: string,
    @Arg("rating", () => Int) rating: number,
    @Arg("title") title: string
  ): Promise<Avis> {
    const avi = Avis.create({ name, lastname, message, imgUrl, rating, title });
    await avi.save();
    return avi;
  }

  @Query(() => [Avis])
  async avis() {
    return await db.getRepository(Avis).find();
  }

  @Mutation(() => Avis)
  async createNewAvis(@Arg("data") newAviData: NewAvisInput) {
    const resultFromSave = await Avis.save({
      ...newAviData,
    });

    return resultFromSave;
  }

  @Query(() => Avis)
  async getOneAviById(@Arg("aviId") aviId: string) {
    const avi = await Avis.findOne({});
    return avi;
  }

  @Mutation(() => Boolean)
  async deleteAvis(@Arg("aviId") aviId: string): Promise<boolean> {
    const avi = await Avis.findOne({ where: { id: parseInt(aviId) } });
    if (!avi) {
      throw new Error("Avis non trouvé !");
    }
    await Avis.remove(avi);
    return true;
  }
}

export default AvisResolver;
