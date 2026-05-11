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
import { Role } from "../entities/User";

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

  @Field()
  imgUrl: string;
}

const normalizeAvisImage = (imgUrl?: string) => {
  const normalizedImage = imgUrl?.trim();

  if (!normalizedImage) {
    throw new Error("Ajoutez une photo avant d'envoyer votre avis.");
  }

  return normalizedImage;
};

const PLACEHOLDER_IMAGE_PATTERNS = [
  "default-image",
  "missing-picture",
  "no-photo",
  "no_photo",
  "no%20photo",
  "placeholder",
  "default-avatar",
  "profile-icon-vector",
  "no-photo-available",
];

const hasProfilePhoto = (imgUrl?: string) => {
  const image = imgUrl?.trim().toLowerCase();

  return Boolean(
    image &&
      !PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => image.includes(pattern))
  );
};

const isCompleteAvis = (avis: Avis) => {
  return Boolean(
    avis.name?.trim() &&
      avis.lastname?.trim() &&
      avis.message?.trim() &&
      avis.title?.trim() &&
      hasProfilePhoto(avis.imgUrl) &&
      avis.rating &&
      avis.rating > 0
  );
};

@Resolver(Avis)
class AvisResolver {
  @Query(() => [Avis])
  async getAllAvis() {
    const avis = await Avis.find();
    const incompleteAvis = avis.filter((avi) => !isCompleteAvis(avi));

    if (incompleteAvis.length) {
      await Avis.remove(incompleteAvis);
    }

    return avis.filter(isCompleteAvis);
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
    const avi = Avis.create({
      name: name.trim(),
      lastname: lastname.trim(),
      message: message.trim(),
      imgUrl: normalizeAvisImage(imgUrl),
      rating,
      title: title.trim(),
    });

    if (!isCompleteAvis(avi)) {
      throw new Error("Remplissez tous les champs de l'avis.");
    }

    await avi.save();
    return avi;
  }

  @Query(() => [Avis])
  async avis() {
    const avis = await db.getRepository(Avis).find();
    return avis.filter(isCompleteAvis);
  }

  @Mutation(() => Avis)
  async createNewAvis(@Arg("data") newAviData: NewAvisInput) {
    const avisToSave = {
      ...newAviData,
      name: newAviData.name.trim(),
      lastname: newAviData.lastname.trim(),
      message: newAviData.message.trim(),
      title: newAviData.title.trim(),
      imgUrl: normalizeAvisImage(newAviData.imgUrl),
    };

    if (!isCompleteAvis(avisToSave as Avis)) {
      throw new Error("Remplissez tous les champs de l'avis.");
    }

    const resultFromSave = await Avis.save({
      ...avisToSave,
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

  @Authorized(Role.Admin)
  @Mutation(() => Avis)
  async replyToAvis(
    @Arg("aviId") aviId: string,
    @Arg("reply") reply: string
  ): Promise<Avis> {
    const cleanReply = reply.trim();

    if (!cleanReply) {
      throw new Error("Ecrivez une reponse avant de l'enregistrer.");
    }

    const avi = await Avis.findOne({ where: { id: parseInt(aviId) } });

    if (!avi) {
      throw new Error("Avis non trouvé !");
    }

    avi.adminReply = cleanReply;
    avi.adminReplyAt = new Date();
    await avi.save();

    return avi;
  }
}

export default AvisResolver;
