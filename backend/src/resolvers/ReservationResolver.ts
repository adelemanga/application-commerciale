import { Context } from "../../src";
import {
  PaymentStatus,
  Reservation,
  ReservationStatus,
} from "../entities/Reservation";
import {
  Arg,
  Authorized,
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
  sendOrderStatusUpdateEmail,
} from "../services/orderEmail";
import { isValidPhoneNumber, normalizePhoneNumber } from "../utils/phone";
import axios from "axios";
import { ClientMessage } from "../entities/ClientMessage";
import { Role } from "../entities/User";
import { Product } from "../entities/Product";

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

const statusUpdateLabels: Record<ReservationStatus, string> = {
  [ReservationStatus.Pending]: "Panier en cours",
  [ReservationStatus.Submitted]: "Commande reçue",
  [ReservationStatus.Validated]: "Commande validee",
  [ReservationStatus.Ongoing]: "Commande en preparation",
  [ReservationStatus.Shipped]: "Colis envoyé",
  [ReservationStatus.Ended]: "Commande terminee",
};

const createArticlesSnapshot = (articles: Article[] = []) =>
  JSON.stringify(
    articles.map((article) => ({
      articleId: article.id,
      productId: article.product?.id,
      name: article.product?.name || "Produit BeautyPlace",
      price: article.product?.price || 0,
      imgUrl: article.product?.imgUrl || "",
    }))
  );

const productImageFallbacks: Record<string, string> = {
  "Serum eclat visage":
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
  "Creme hydratante douceur":
    "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
  "Palette maquillage rose":
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
  "Huile capillaire sublime":
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
  "Kit manucure premium":
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  "Masque visage cocooning":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
};

const calculateReservationTotal = (reservation: Reservation) => {
  const articlesTotal = calculateTotal(reservation.articles ?? []);

  if (articlesTotal > 0 || !reservation.articlesSnapshot) {
    return articlesTotal;
  }

  try {
    const snapshot = JSON.parse(reservation.articlesSnapshot);

    if (!Array.isArray(snapshot)) {
      return 0;
    }

    return snapshot.reduce(
      (sum: number, item: { price?: number }) =>
        sum + (Number(item.price) || 0),
      0
    );
  } catch {
    return 0;
  }
};

const hasPaidOrderValue = (reservation: Reservation) =>
  reservation.articles?.some((article) => Number(article.product?.price) > 0) ||
  calculateReservationTotal(reservation) > 0;

const hasConfirmedOnlinePayment = (reservation: Reservation) =>
  reservation.paymentMethod === "card" &&
  reservation.paymentStatus === PaymentStatus.Paid &&
  Boolean(reservation.stripeSessionId) &&
  Boolean(reservation.stripePaymentConfirmedAt);

const hasClientVisiblePaidOrder = (reservation: Reservation) =>
  reservation.paymentStatus === PaymentStatus.Paid &&
  hasPaidOrderValue(reservation) &&
  calculateReservationTotal(reservation) > 0;

const verifyStripePaymentConfirmation = async (reservation: Reservation) => {
  if (
    reservation.stripePaymentConfirmedAt ||
    reservation.paymentMethod !== "card" ||
    reservation.paymentStatus !== PaymentStatus.Paid ||
    !reservation.stripeSessionId
  ) {
    return reservation;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return reservation;
  }

  try {
    const response = await axios.get(
      `https://api.stripe.com/v1/checkout/sessions/${reservation.stripeSessionId}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (response.data.payment_status === "paid") {
      reservation.stripePaymentConfirmedAt = new Date(
        response.data.created ? response.data.created * 1000 : Date.now()
      );
      await reservation.save();
    }
  } catch (error) {
    console.warn(
      `Impossible de verifier le paiement Stripe pour la reservation ${reservation.id}.`,
      error
    );
  }

  return reservation;
};

const verifyStripePaymentConfirmations = async (reservations: Reservation[]) => {
  await Promise.all(reservations.map(verifyStripePaymentConfirmation));
  return reservations;
};

const enrichSnapshotWithLocalProducts = async (reservation: Reservation) => {
  if (!reservation.articlesSnapshot) {
    return reservation;
  }

  try {
    const snapshot = JSON.parse(reservation.articlesSnapshot);

    if (!Array.isArray(snapshot)) {
      return reservation;
    }

    let hasChanged = false;
    const enrichedSnapshot = await Promise.all(
      snapshot.map(async (item: any) => {
        if (item.imgUrl && item.price) {
          return item;
        }

        const product = item.productId
          ? await Product.findOne({ where: { id: item.productId } })
          : item.name
          ? await Product.findOne({ where: { name: item.name } })
          : null;

        if (!product) {
          const fallbackImage = item.name
            ? productImageFallbacks[item.name]
            : undefined;

          if (!fallbackImage || item.imgUrl) {
            return item;
          }

          hasChanged = true;
          return {
            ...item,
            imgUrl: fallbackImage,
          };
        }

        hasChanged = true;
        return {
          ...item,
          productId: item.productId || product.id,
          name: item.name || product.name,
          price: item.price || product.price,
          imgUrl: item.imgUrl || product.imgUrl,
        };
      })
    );

    if (hasChanged) {
      reservation.articlesSnapshot = JSON.stringify(enrichedSnapshot);
      await reservation.save();
    }
  } catch {
    return reservation;
  }

  return reservation;
};

const backfillStripeArticlesSnapshot = async (reservation: Reservation) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  await enrichSnapshotWithLocalProducts(reservation);

  if (
    !stripeSecretKey ||
    reservation.articles?.length ||
    reservation.articlesSnapshot ||
    !reservation.stripeSessionId
  ) {
    return reservation;
  }

  try {
    const response = await axios.get(
      `https://api.stripe.com/v1/checkout/sessions/${reservation.stripeSessionId}/line_items`,
      {
        params: {
          expand: ["data.price.product"],
        },
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    const snapshot = (response.data?.data ?? []).flatMap((lineItem: any) => {
      const quantity = Number(lineItem.quantity) || 1;
      const product = lineItem.price?.product ?? {};
      const unitAmount = Number(lineItem.price?.unit_amount) || 0;

      return Array.from({ length: quantity }, (_unused, index) => ({
        articleId: `stripe-${lineItem.id}-${index}`,
        productId:
          typeof product === "string" ? product : product.id || lineItem.id,
        name:
          lineItem.description ||
          (typeof product === "string" ? undefined : product.name) ||
          "Produit BeautyPlace",
        price: unitAmount / 100,
        imgUrl: typeof product === "string" ? "" : product.images?.[0] || "",
      }));
    });

    if (snapshot.length) {
      reservation.articlesSnapshot = JSON.stringify(snapshot);
      await reservation.save();
      await enrichSnapshotWithLocalProducts(reservation);
    }
  } catch (error) {
    console.warn(
      `Impossible de recuperer les produits Stripe pour la reservation ${reservation.id}.`,
      error
    );
  }

  return reservation;
};

const backfillStripeSnapshots = async (reservations: Reservation[]) => {
  await Promise.all(reservations.map(backfillStripeArticlesSnapshot));
  return reservations;
};

const normalizeEndedPaidReservations = async (reservations: Reservation[]) => {
  await Promise.all(
    reservations.map(async (reservation) => {
      const total = calculateReservationTotal(reservation);

      if (
        reservation.status === ReservationStatus.Ended &&
        reservation.paymentStatus !== PaymentStatus.Paid &&
        total > 0
      ) {
        reservation.paymentStatus = PaymentStatus.Paid;
        if (!reservation.articlesSnapshot) {
          reservation.articlesSnapshot = createArticlesSnapshot(
            reservation.articles ?? []
          );
        }
        await reservation.save();
      }
    })
  );

  return reservations;
};

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
      order: {
        createdAt: "DESC",
      },
    });

    await backfillStripeSnapshots(reservations);
    await verifyStripePaymentConfirmations(reservations);

    return reservations.filter(
      (reservation) =>
        !reservation.archivedByAdmin &&
        !reservation.removedFromAdminHistory &&
        hasConfirmedOnlinePayment(reservation) &&
        reservation.status !== ReservationStatus.Pending &&
        calculateReservationTotal(reservation) > 0
    );
  }

  @Query(() => [Reservation])
  async getTreatedReservationsAdmin() {
    const reservations = await Reservation.find({
      relations: ["user", "articles", "articles.product"],
      order: {
        createdAt: "DESC",
      },
    });

    await backfillStripeSnapshots(reservations);
    await verifyStripePaymentConfirmations(reservations);
    await normalizeEndedPaidReservations(reservations);

    return reservations.filter(
      (reservation) =>
        calculateReservationTotal(reservation) > 0 &&
        !reservation.removedFromAdminHistory &&
        (reservation.archivedByAdmin ||
          reservation.status === ReservationStatus.Ended)
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
        const totalPrice = calculateReservationTotal(reservation);
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
      const normalizedEmail = context.email?.trim().toLowerCase();
      const where = [
        { user: { id: context.id } },
        ...(normalizedEmail ? [{ user: { email: normalizedEmail } }] : []),
      ];
      const reservations = await Reservation.find({
        where,
        relations: ["user", "articles", "articles.product"],
        order: {
          createdAt: "DESC",
        },
      });

      await verifyStripePaymentConfirmations(reservations);
      await backfillStripeSnapshots(reservations);

      const uniqueReservations = new Map<string, Reservation>();

      reservations.forEach((reservation) => {
        uniqueReservations.set(String(reservation.id), reservation);
      });

      return Array.from(uniqueReservations.values())
        .filter((reservation) => {
          if (reservation.hiddenByClient) {
            return false;
          }

          const hasProducts =
            reservation.articles.length > 0 ||
            Boolean(reservation.articlesSnapshot);

          return (
            hasClientVisiblePaidOrder(reservation) &&
            hasProducts &&
            calculateReservationTotal(reservation) > 0
          );
        })
        .map((reservation) => {
          const totalPrice = calculateReservationTotal(reservation);
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
        relations: ["product"],
      });
      if (!article) {
        throw new Error("Article not found");
      }

      if (Number(article.product?.price) <= 0) {
        throw new Error("Une commande a zero euro ne peut pas exister.");
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
        relations: ["product"],
      });
      if (!articleToAdd) {
        throw new Error("Article not found");
      }

      if (Number(articleToAdd.product?.price) <= 0) {
        throw new Error("Une commande a zero euro ne peut pas exister.");
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
    const cleanCustomerPhone = normalizePhoneNumber(customerPhone || "");

    if (!isValidPhoneNumber(cleanCustomerPhone)) {
      throw new Error("Numero de telephone invalide.");
    }

    if (
      paymentMethod !== "card" ||
      reservation.paymentMethod !== "card" ||
      reservation.paymentStatus !== PaymentStatus.Paid ||
      !reservation.stripeSessionId
    ) {
      throw new Error(
        "La commande doit etre payée par Stripe avant d'etre envoyée à l'administrateur."
      );
    }

    reservation.status = ReservationStatus.Submitted;
    reservation.customerPhone = cleanCustomerPhone;
    reservation.customerAddress = customerAddress;
    reservation.paymentMethod = paymentMethod;
    reservation.pickupDate =
      paymentMethod !== "card" ? cleanPickupDate : undefined;
    reservation.pickupTime =
      paymentMethod !== "card" ? cleanPickupTime : undefined;
    reservation.articlesSnapshot = createArticlesSnapshot(reservation.articles);
    reservation.paymentStatus = PaymentStatus.Paid;
    await reservation.save();

    reservation = await Reservation.findOneOrFail({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });

    try {
      await sendOrderEmails(reservation);
    } catch (error) {
      console.warn(
        "Commande enregistree, mais email non envoyé. Verifiez la configuration Gmail.",
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

    if (!hasPaidOrderValue(reservation)) {
      throw new Error("Une commande a zero euro ne peut pas etre payée.");
    }

    const cleanDeliveryMethod = deliveryMethod?.trim() || "home";
    const cleanCustomerPhone = normalizePhoneNumber(customerPhone || "");
    const cleanCustomerAddress = customerAddress?.trim();
    const cleanPickupDate = pickupDate?.trim() || undefined;
    const cleanPickupTime = pickupTime?.trim() || undefined;
    const cleanRelayName = relayName?.trim() || undefined;
    const cleanRelayAddress = relayAddress?.trim() || undefined;

    if (!["home", "store", "relay"].includes(cleanDeliveryMethod)) {
      throw new Error("Invalid delivery method");
    }

    if (!cleanCustomerPhone || !isValidPhoneNumber(cleanCustomerPhone)) {
      throw new Error("Renseignez un numero de telephone valide.");
    }

    if (cleanDeliveryMethod === "home" && !cleanCustomerAddress) {
      throw new Error(
        "Adresse de livraison obligatoire avant de continuer vers le paiement."
      );
    }

    if (cleanDeliveryMethod === "store" && !cleanPickupDate) {
      throw new Error("Choisissez une date de retrait en magasin.");
    }

    if (
      cleanDeliveryMethod === "relay" &&
      (!cleanRelayName || !cleanRelayAddress)
    ) {
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
      params.append(`line_items[${index}][price_data][currency]`, "eur");
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

    reservation.customerPhone = cleanCustomerPhone;
    reservation.customerAddress = cleanCustomerAddress || "Retrait magasin";
    reservation.paymentMethod = "card";
    reservation.paymentStatus = PaymentStatus.Pending;
    reservation.stripeSessionId = response.data.id;
    reservation.articlesSnapshot = createArticlesSnapshot(reservation.articles);
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

    if (!hasPaidOrderValue(reservation)) {
      throw new Error("Une commande a zero euro ne peut pas etre confirmee.");
    }

    reservation.status = ReservationStatus.Submitted;
    reservation.paymentMethod = "card";
    reservation.paymentStatus = PaymentStatus.Paid;
    reservation.stripeSessionId = sessionId;
    reservation.stripePaymentConfirmedAt = new Date(
      response.data.created ? response.data.created * 1000 : Date.now()
    );
    if (!reservation.articlesSnapshot) {
      reservation.articlesSnapshot = createArticlesSnapshot(
        reservation.articles
      );
    }
    await reservation.save();

    if (!reservation.confirmationEmailSentAt) {
      try {
        await sendOrderEmails(reservation);
        reservation.confirmationEmailSentAt = new Date();
        await reservation.save();
      } catch (error) {
        console.warn(
          "Commande payée, mais email non envoye. Verifiez la configuration Gmail.",
          error
        );
      }
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

    if (
      !Object.values(ReservationStatus).includes(status as ReservationStatus)
    ) {
      throw new Error("Invalid reservation status");
    }

    if (
      !Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)
    ) {
      throw new Error("Invalid payment status");
    }

    await verifyStripePaymentConfirmation(reservation);

    if (
      (paymentStatus as PaymentStatus) === PaymentStatus.Paid &&
      !hasConfirmedOnlinePayment(reservation)
    ) {
      throw new Error(
        "Paiement carte non confirme par Stripe. Cette commande ne peut pas etre marquee payee."
      );
    }

    const isOnlinePaid =
      reservation.paymentMethod === "card" &&
      (paymentStatus as PaymentStatus) === PaymentStatus.Paid &&
      Boolean(reservation.stripeSessionId) &&
      Boolean(reservation.stripePaymentConfirmedAt);
    const isShippableDelivery =
      isOnlinePaid && reservation.deliveryMethod !== "store";
    const cleanShippingCarrier = shippingCarrier?.trim() || "";
    const cleanTrackingNumber = trackingNumber?.trim() || "";

    const nextStatus =
      !isOnlinePaid && (paymentStatus as PaymentStatus) === PaymentStatus.Paid
        ? ReservationStatus.Ended
        : (status as ReservationStatus);

    if (nextStatus === ReservationStatus.Shipped && !isOnlinePaid) {
      throw new Error(
        "Seules les commandes payées en ligne peuvent être marquees comme colis envoyé."
      );
    }

    if (isShippableDelivery && !cleanShippingCarrier) {
      throw new Error(
        "Choisissez un transporteur avant d'enregistrer cette commande."
      );
    }

    if (
      isShippableDelivery &&
      [ReservationStatus.Shipped, ReservationStatus.Ended].includes(
        nextStatus
      ) &&
      !cleanTrackingNumber
    ) {
      throw new Error(
        "Renseignez le numero de suivi avant d'enregistrer une commande envoyée."
      );
    }

    const finalPaymentStatus =
      nextStatus === ReservationStatus.Ended
        ? PaymentStatus.Paid
        : (paymentStatus as PaymentStatus);
    const previousStatus = reservation.status;
    const previousPaymentStatus = reservation.paymentStatus;
    const previousCarrier = reservation.shippingCarrier;
    const previousTrackingNumber = reservation.trackingNumber;

    reservation.status = nextStatus;
    reservation.paymentStatus = finalPaymentStatus;
    reservation.shippingCarrier = isShippableDelivery
      ? cleanShippingCarrier
      : null;
    reservation.trackingNumber = isShippableDelivery
      ? cleanTrackingNumber || null
      : null;
    if (!reservation.articlesSnapshot) {
      reservation.articlesSnapshot = createArticlesSnapshot(
        reservation.articles
      );
    }
    await reservation.save();

    const hasOrderUpdate =
      previousStatus !== reservation.status ||
      previousPaymentStatus !== reservation.paymentStatus ||
      previousCarrier !== reservation.shippingCarrier ||
      previousTrackingNumber !== reservation.trackingNumber;

    if (hasOrderUpdate && reservation.user) {
      const statusLabel =
        statusUpdateLabels[reservation.status] || reservation.status;
      const trackingChanged =
        previousCarrier !== reservation.shippingCarrier ||
        previousTrackingNumber !== reservation.trackingNumber;
      const trackingLine = reservation.trackingNumber
        ? ` Transporteur : ${reservation.shippingCarrier}, suivi : ${reservation.trackingNumber}.`
        : "";
      const notificationPrefix = trackingChanged
        ? `Mise a jour du suivi de votre commande #${reservation.id}`
        : `Avancement de votre commande #${reservation.id}`;
      const platformMessage = ClientMessage.create({
        client: reservation.user,
        senderRole: "Admin",
        message: `${notificationPrefix} : ${statusLabel}.${trackingLine}`,
        readAt: undefined,
      });

      await platformMessage.save();

      try {
        await sendOrderStatusUpdateEmail(reservation);
      } catch (error) {
        console.error("Erreur email avancement commande:", error);
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
      throw new Error(
        "Seuls les colis envoyés peuvent etre confirmes comme recus."
      );
    }

    if (reservation.status !== ReservationStatus.Shipped) {
      throw new Error(
        "Le colis doit etre marque comme envoyé avant confirmation."
      );
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
  async hideReservationFromClient(
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
      relations: ["articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    reservation.hiddenByClient = true;
    await reservation.save();

    return true;
  }

  @Mutation(() => Boolean)
  @Authorized(Role.Admin)
  async deleteReservationAdmin(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    reservation.archivedByAdmin = true;
    reservation.deletedFromAdminHistory = false;
    await reservation.save();

    return true;
  }

  @Mutation(() => Boolean)
  @Authorized(Role.Admin)
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

    const isTreatedOrder =
      reservation.archivedByAdmin ||
      reservation.status === ReservationStatus.Ended;

    if (!isTreatedOrder) {
      throw new Error(
        "Seules les commandes presentes dans l'historique peuvent etre supprimees."
      );
    }

    reservation.deletedFromAdminHistory = true;
    reservation.removedFromAdminHistory = true;
    await reservation.save();

    return true;
  }

  @Mutation(() => Reservation)
  async restoreTreatedReservationAdmin(
    @Arg("reservationId", () => ID) reservationId: string
  ) {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
      relations: ["user", "articles", "articles.product"],
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.paymentStatus !== PaymentStatus.Paid) {
      throw new Error("Seules les commandes payées peuvent être restaurées.");
    }

    reservation.archivedByAdmin = false;
    reservation.deletedFromAdminHistory = false;
    reservation.status = ReservationStatus.Submitted;

    await reservation.save();

    return Reservation.findOneOrFail({
      where: { id: reservation.id },
      relations: ["user", "articles", "articles.product"],
    });
  }
}

export default ReservationResolver;
