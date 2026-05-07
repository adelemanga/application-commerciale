import { Context } from "../../src";
import {
  PaymentStatus,
  Reservation,
  ReservationStatus,
} from "../entities/Reservation";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  ID,
} from "type-graphql";
import { calculateTotal } from "../../utils/reservation/CalculateTotal";
import { Article } from "../entities/Article";
import { sendOrderEmails } from "../services/orderEmail";

// custom object created to send the totalPrice along with the reservation data
@ObjectType()
export class ReservationWithTotal {
  @Field(() => Reservation)
  reservation: Reservation;

  @Field(() => Number)
  totalPrice: number;
}

@InputType()
class NewReservationInput {
  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field(() => ID)
  articleId: string;
}

@Resolver(Reservation)
export class ReservationResolver {
  @Query(() => [Reservation])
  async getAllReservations() {
    const reservations = await Reservation.find({
      relations: ["user", "articles", "articles.product"],
    });
    return reservations;
  }

  @Query(() => Reservation)
  async getOneReservationById(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });
    return reservation;
  }

  @Query(() => [Reservation])
  async getReservationsByArticleId(
    @Arg("articleId", () => ID) articleId: string
  ) {
    const reservations = await Reservation.find({
      where: { articles: { id: articleId } },
      relations: ["user", "articles", "articles.product"],
    });
    return reservations;
  }

  @Query(() => ReservationWithTotal, { nullable: true })
  async getCurrentReservationByUserId(@Ctx() context: Context) {
    if (context.id !== undefined) {
      const reservation = await Reservation.findOne({
        where: {
          user: { id: context.id },
          status: ReservationStatus.Pending,
        },
        order: { createdAt: "DESC" },
        relations: ["user", "articles", "articles.product"],
      });
      if (reservation) {
        const totalPrice = calculateTotal(reservation.articles);
        return { reservation, totalPrice };
      } else {
        return null;
      }
    }

    return null;
  }

  @Query(() => [ReservationWithTotal])
  async getReservationsByUserId(@Ctx() context: Context) {
    if (context.id !== undefined) {
      const reservations = await Reservation.find({
        where: { user: { id: context.id } },
        relations: ["user", "articles", "articles.product"],
        order: {
          createdAt: "DESC",
        },
      });

      return reservations.map((reservation) => {
        const totalPrice = calculateTotal(reservation.articles);
        return { reservation, totalPrice };
      });
    } else {
      return [];
    }
  }

  @Mutation(() => Reservation)
  async handleReservation(
    @Ctx() context: Context,
    @Arg("data") reservationData: NewReservationInput
  ) {
    if (!context.id) {
      throw new Error("User not authenticated");
    }

    // Check if user already has a pending reservation
    let reservation = await Reservation.findOne({
      where: {
        user: { id: context.id },
        status: ReservationStatus.Pending,
      },
      relations: ["articles"],
    });

    // If no pending reservation exists, create a new reservation
    if (!reservation) {
      const article = await Article.findOne({
        where: { id: reservationData.articleId },
      });
      if (!article) {
        throw new Error("Article not found");
      }

      reservation = Reservation.create({
        startDate: reservationData.startDate,
        endDate: reservationData.endDate,
        articles: [article],
        user: { id: context.id },
        status: ReservationStatus.Pending,
      });
      await reservation.save();
    } else {
      // If a pending reservation exists, add the article to the reservation
      const articleToAdd = await Article.findOne({
        where: { id: reservationData.articleId },
      });
      if (!articleToAdd) {
        throw new Error("Article not found");
      }

      // Check if article was already in the reservation
      const isAlreadyInReservation = reservation.articles.some(
        (article) => article.id === articleToAdd.id
      );
      if (!isAlreadyInReservation) {
        reservation.articles.push(articleToAdd);
      }

      await reservation.save();
    }
    return Reservation.findOneOrFail({
      where: { id: reservation.id },
      relations: ["user", "articles", "articles.product"],
    });
  }

  @Mutation(() => Reservation)
  async submitReservationToAdmin(
    @Arg("reservationId", () => ID) reservationId: string,
    @Arg("customerPhone") customerPhone: string,
    @Arg("customerAddress") customerAddress: string,
    @Arg("paymentMethod") paymentMethod: string
  ) {
    let reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    reservation.status = ReservationStatus.Submitted;
    reservation.customerPhone = customerPhone;
    reservation.customerAddress = customerAddress;
    reservation.paymentMethod = paymentMethod;
    reservation.paymentStatus =
      paymentMethod === "card" ? PaymentStatus.Paid : PaymentStatus.Pending;
    await reservation.save();

    reservation = await Reservation.findOneOrFail({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });

    try {
      await sendOrderEmails(reservation);
    } catch (error) {
      console.warn(
        "Commande enregistree, mais email non envoye. Verifiez la configuration Gmail.",
        error
      );
    }

    return reservation;
  }

  @Mutation(() => Reservation)
  async updateReservationStatus(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }
    reservation.status = ReservationStatus.Validated;
    await reservation.save();

    return reservation;
  }

  @Mutation(() => Reservation)
  async updateReservationAdmin(
    @Arg("reservationId", () => ID) reservationId: string,
    @Arg("status") status: string,
    @Arg("paymentStatus") paymentStatus: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (!Object.values(ReservationStatus).includes(status as ReservationStatus)) {
      throw new Error("Invalid reservation status");
    }

    if (!Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      throw new Error("Invalid payment status");
    }

    reservation.status = status as ReservationStatus;
    reservation.paymentStatus = paymentStatus as PaymentStatus;
    await reservation.save();

    return reservation;
  }

  @Mutation(() => Reservation)
  async cancelReservation(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }
    reservation.status = ReservationStatus.Ended;
    await reservation.save();

    return reservation;
  }
}

export default ReservationResolver;
