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
import {
  sendOrderEmails,
  sendOrderReceivedEmail,
  sendTrackingUpdateEmail,
} from "../services/orderEmail";
import axios from "axios";

// custom object created to send the totalPrice along with the reservation data
@ObjectType()
export class ReservationWithTotal {
  @Field(() => Reservation)
  reservation: Reservation;

  @Field(() => Number)
  totalPrice: number;
}

@ObjectType()
class StripeCheckoutSession {
  @Field()
  url: string;
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
    return reservations.filter(
      (reservation) =>
        reservation.articles.length > 0 && calculateTotal(reservation.articles) > 0
    );
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
    @Arg("paymentMethod") paymentMethod: string,
    @Arg("pickupDate", { nullable: true }) pickupDate?: string,
    @Arg("pickupTime", { nullable: true }) pickupTime?: string
  ) {
    let reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    const cleanPickupDate = pickupDate?.trim() || undefined;
    const cleanPickupTime = pickupTime?.trim() || undefined;

    if (paymentMethod !== "card" && !cleanPickupDate) {
      throw new Error("Choisissez une date de retrait sur place.");
    }

    reservation.status = ReservationStatus.Submitted;
    reservation.customerPhone = customerPhone;
    reservation.customerAddress = customerAddress;
    reservation.paymentMethod = paymentMethod;
    reservation.pickupDate = paymentMethod !== "card" ? cleanPickupDate : undefined;
    reservation.pickupTime = paymentMethod !== "card" ? cleanPickupTime : undefined;
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

  @Mutation(() => StripeCheckoutSession)
  async createStripeCheckoutSession(
    @Ctx() context: Context,
    @Arg("reservationId", () => ID) reservationId: string,
    @Arg("customerPhone") customerPhone: string,
    @Arg("customerAddress") customerAddress: string,
    @Arg("deliveryMethod", { nullable: true }) deliveryMethod?: string,
    @Arg("pickupDate", { nullable: true }) pickupDate?: string,
    @Arg("pickupTime", { nullable: true }) pickupTime?: string,
    @Arg("relayName", { nullable: true }) relayName?: string,
    @Arg("relayAddress", { nullable: true }) relayAddress?: string,
    @Arg("frontendUrl", { nullable: true }) frontendUrl?: string
  ) {
    if (!context.id) {
      throw new Error("User not authenticated");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe is not configured");
    }

    const reservation = await Reservation.findOne({
      where: {
        id: reservationId,
        user: { id: context.id },
      },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation || reservation.articles.length === 0) {
      throw new Error("Reservation not found");
    }

    const cleanDeliveryMethod = deliveryMethod?.trim() || "home";
    const cleanPickupDate = pickupDate?.trim() || undefined;
    const cleanPickupTime = pickupTime?.trim() || undefined;
    const cleanRelayName = relayName?.trim() || undefined;
    const cleanRelayAddress = relayAddress?.trim() || undefined;

    if (!["home", "store", "relay"].includes(cleanDeliveryMethod)) {
      throw new Error("Invalid delivery method");
    }

    if (cleanDeliveryMethod === "store" && !cleanPickupDate) {
      throw new Error("Choisissez une date de retrait en magasin.");
    }

    if (cleanDeliveryMethod === "relay" && (!cleanRelayName || !cleanRelayAddress)) {
      throw new Error("Renseignez le point relais.");
    }

    const checkoutFrontendUrl =
      frontendUrl?.startsWith("http://localhost") ||
      frontendUrl?.startsWith("http://127.0.0.1") ||
      frontendUrl?.startsWith("https://")
        ? frontendUrl
        : process.env.FRONTEND_URL || "http://localhost:3002";
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append(
      "success_url",
      `${checkoutFrontendUrl}/paiement-carte?session_id={CHECKOUT_SESSION_ID}`
    );
    params.append(
      "cancel_url",
      `${checkoutFrontendUrl}/paiement-carte?payment=cancelled`
    );
    params.append("customer_email", reservation.user.email);
    params.append("metadata[reservationId]", reservation.id);

    reservation.articles.forEach((article, index) => {
      params.append(`line_items[${index}][quantity]`, "1");
      params.append(
        `line_items[${index}][price_data][currency]`,
        "eur"
      );
      params.append(
        `line_items[${index}][price_data][unit_amount]`,
        String(Math.round(article.product.price * 100))
      );
      params.append(
        `line_items[${index}][price_data][product_data][name]`,
        article.product.name
      );
      params.append(
        `line_items[${index}][price_data][product_data][description]`,
        article.product.description ?? "Produit beaute"
      );
    });

    const response = await axios.post(
      "https://api.stripe.com/v1/checkout/sessions",
      params,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    reservation.customerPhone = customerPhone;
    reservation.customerAddress = customerAddress;
    reservation.paymentMethod = "card";
    reservation.paymentStatus = PaymentStatus.Pending;
    reservation.stripeSessionId = response.data.id;
    reservation.deliveryMethod = cleanDeliveryMethod;
    reservation.pickupDate =
      cleanDeliveryMethod === "store" ? cleanPickupDate : undefined;
    reservation.pickupTime =
      cleanDeliveryMethod === "store" ? cleanPickupTime : undefined;
    reservation.relayName =
      cleanDeliveryMethod === "relay" ? cleanRelayName : undefined;
    reservation.relayAddress =
      cleanDeliveryMethod === "relay" ? cleanRelayAddress : undefined;
    await reservation.save();

    return { url: response.data.url };
  }

  @Mutation(() => Reservation)
  async confirmStripeCheckoutSession(
    @Ctx() context: Context,
    @Arg("sessionId") sessionId: string
  ) {
    if (!context.id) {
      throw new Error("User not authenticated");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe is not configured");
    }

    const response = await axios.get(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    const reservationId = response.data.metadata?.reservationId;
    const reservation = await Reservation.findOne({
      where: {
        id: reservationId,
        user: { id: context.id },
      },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (response.data.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    reservation.status = ReservationStatus.Submitted;
    reservation.paymentMethod = "card";
    reservation.paymentStatus = PaymentStatus.Paid;
    reservation.stripeSessionId = sessionId;
    await reservation.save();

    try {
      await sendOrderEmails(reservation);
    } catch (error) {
      console.warn(
        "Commande payee, mais email non envoye. Verifiez la configuration Gmail.",
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
    @Arg("paymentStatus") paymentStatus: string,
    @Arg("shippingCarrier", () => String, { nullable: true })
    shippingCarrier?: string,
    @Arg("trackingNumber", () => String, { nullable: true })
    trackingNumber?: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: { user: true, articles: { product: true } },
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

    const isOnlinePaid =
      reservation.paymentMethod === "card" &&
      (paymentStatus as PaymentStatus) === PaymentStatus.Paid &&
      Boolean(reservation.stripeSessionId);

    const nextStatus =
      !isOnlinePaid && (paymentStatus as PaymentStatus) === PaymentStatus.Paid
        ? ReservationStatus.Ended
        : (status as ReservationStatus);

    if (nextStatus === ReservationStatus.Shipped && !isOnlinePaid) {
      throw new Error(
        "Seules les commandes payees en ligne peuvent etre marquees comme colis envoye."
      );
    }

    reservation.status = nextStatus;
    reservation.paymentStatus = paymentStatus as PaymentStatus;
    reservation.shippingCarrier = isOnlinePaid ? shippingCarrier?.trim() || null : null;
    reservation.trackingNumber = isOnlinePaid ? trackingNumber?.trim() || null : null;
    await reservation.save();

    if (reservation.status === ReservationStatus.Shipped && reservation.trackingNumber) {
      try {
        await sendTrackingUpdateEmail(reservation);
      } catch (error) {
        console.error("Erreur email suivi colis:", error);
      }
    }

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

  @Mutation(() => Reservation)
  async confirmReservationReceived(
    @Ctx() context: Context,
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    if (!context.id) {
      throw new Error("User not authenticated");
    }

    const reservation = await Reservation.findOne({
      where: {
        id: reservationId,
        user: { id: context.id },
      },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.paymentMethod !== "card" || !reservation.stripeSessionId) {
      throw new Error("Seuls les colis envoyes peuvent etre confirmes comme recus.");
    }

    if (reservation.status !== ReservationStatus.Shipped) {
      throw new Error("Le colis doit etre marque comme envoye avant confirmation.");
    }

    reservation.status = ReservationStatus.Ended;
    await reservation.save();

    try {
      await sendOrderReceivedEmail(reservation);
    } catch (error) {
      console.warn(
        "Reception confirmee, mais email admin non envoye. Verifiez Gmail.",
        error
      );
    }

    return reservation;
  }

  @Mutation(() => Boolean)
  async deleteTreatedReservationAdmin(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: ["articles"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    const isTreatedPickup =
      reservation.paymentStatus === PaymentStatus.Paid && !reservation.stripeSessionId;

    if (reservation.status !== ReservationStatus.Ended && !isTreatedPickup) {
      throw new Error("Seules les commandes traitees peuvent etre supprimees.");
    }

    reservation.articles = [];
    await reservation.save();
    await reservation.remove();

    return true;
  }
}

export default ReservationResolver;
