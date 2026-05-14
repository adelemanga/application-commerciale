import {
  Arg,
  Authorized,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  Ctx,
} from "type-graphql";
import { db } from "../config/db";
import { Avis } from "../entities/Avis";
import { Context } from "../../src";
import {
  PaymentStatus,
  Reservation,
  ReservationStatus,
} from "../entities/Reservation";
import { Role, User } from "../entities/User";

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

const getVerifiedReviewClient = async (context: Context) => {
  if (!context.id) {
    throw new Error("Connectez-vous avec un compte client pour laisser un avis.");
  }

  const client = await User.findOne({
    where: {
      id: context.id,
      role: Role.User,
    },
  });

  if (!client) {
    throw new Error("Connectez-vous avec un compte client pour laisser un avis.");
  }

  const receivedPaidOrder = await Reservation.findOne({
    where: {
      user: { id: client.id },
      paymentStatus: PaymentStatus.Paid,
      status: ReservationStatus.Ended,
    },
  });

  if (!receivedPaidOrder) {
    throw new Error(
      "Vous pourrez laisser un avis lorsque votre commande payee sera recue."
    );
  }

  return client;
};

const hasVerifiedReviewOrder = async (userId?: string) => {
  if (!userId) {
    return false;
  }

  const receivedPaidOrder = await Reservation.findOne({
    where: {
      user: { id: userId },
      paymentStatus: PaymentStatus.Paid,
      status: ReservationStatus.Ended,
    },
  });

  return Boolean(receivedPaidOrder);
};

@Resolver(Avis)
class AvisResolver {
  @Query(() => [Avis])
  async getAllAvis() {
    const avis = await Avis.find({
      relations: {
        user: true,
      },
      order: {
        id: "DESC",
      },
    });
    const incompleteAvis = avis.filter((avi) => !isCompleteAvis(avi));

    if (incompleteAvis.length) {
      await Avis.remove(incompleteAvis);
    }

    const completeAvis = avis.filter(isCompleteAvis);
    const verifiedAvis = await Promise.all(
      completeAvis.map(async (avi) =>
        (await hasVerifiedReviewOrder(avi.user?.id)) ? avi : null
      )
    );

    return verifiedAvis.filter(Boolean) as Avis[];
  }

  @Authorized(Role.User)
  @Mutation(() => Avis)
  async addAvis(
    @Arg("name") name: string,
    @Arg("lastname") lastname: string,
    @Arg("message") message: string,
    @Arg("imgUrl") imgUrl: string,
    @Arg("rating", () => Int) rating: number,
    @Arg("title") title: string,
    @Ctx() context: Context
  ): Promise<Avis> {
    const client = await getVerifiedReviewClient(context);
    const avi = Avis.create({
      name: name.trim(),
      lastname: lastname.trim(),
      message: message.trim(),
      imgUrl: normalizeAvisImage(imgUrl),
      rating,
      title: title.trim(),
      user: client,
    });

    if (!isCompleteAvis(avi)) {
      throw new Error("Remplissez tous les champs de l'avis.");
    }

    await avi.save();
    return avi;
  }

  @Query(() => [Avis])
  async avis() {
    const avis = await db.getRepository(Avis).find({
      relations: {
        user: true,
      },
      order: {
        id: "DESC",
      },
    });
    const completeAvis = avis.filter(isCompleteAvis);
    const verifiedAvis = await Promise.all(
      completeAvis.map(async (avi) =>
        (await hasVerifiedReviewOrder(avi.user?.id)) ? avi : null
      )
    );

    return verifiedAvis.filter(Boolean) as Avis[];
  }

  @Authorized(Role.User)
  @Mutation(() => Avis)
  async createNewAvis(
    @Arg("data") newAviData: NewAvisInput,
    @Ctx() context: Context
  ) {
    const client = await getVerifiedReviewClient(context);
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
      user: client,
    });

    return resultFromSave;
  }

  @Query(() => Avis)
  async getOneAviById(@Arg("aviId") aviId: string) {
    const avi = await Avis.findOne({});
    return avi;
  }

  @Authorized(Role.Admin)
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
