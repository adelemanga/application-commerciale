import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  DELETE_TREATED_RESERVATION_ADMIN,
  RESTORE_TREATED_RESERVATION_ADMIN,
} from "../graphql/mutations";
import { GET_TREATED_RESERVATIONS_ADMIN, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";
import { defaultProductImage, getProductImage } from "../utils/productImages";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const paymentLabels: Record<string, string> = {
  pending: "a payer",
  paid: "paye",
};

const deliveryLabels: Record<string, string> = {
  home: "Livraison a domicile",
  relay: "Point relais",
  store: "Retrait magasin",
};

const groupArticlesByProduct = (articles: any[] = []) =>
  articles.reduce((groups: any[], article: any) => {
    const product = article.product ?? {};
    const productKey = product.id ?? product.name ?? article.id;
    const existingGroup = groups.find(
      (group) => group.productKey === productKey
    );

    if (existingGroup) {
      existingGroup.quantity += 1;
      existingGroup.total += product.price ?? 0;
      return groups;
    }

    groups.push({
      productKey,
      product,
      quantity: 1,
      total: product.price ?? 0,
    });

    return groups;
  }, []);

const getOrderedArticles = (reservation: any) => {
  if (reservation.articles?.length) {
    return reservation.articles.map((article: any) => ({
      ...article,
      product: {
        ...article.product,
        imgUrl: getProductImage(article.product),
      },
    }));
  }

  if (!reservation.articlesSnapshot) {
    return [];
  }

  try {
    const snapshot = JSON.parse(reservation.articlesSnapshot);

    if (!Array.isArray(snapshot)) {
      return [];
    }

    return snapshot.map((item: any, index: number) => ({
      id: item.articleId || `${item.productId || "snapshot"}-${index}`,
      product: {
        id: item.productId || item.articleId || `snapshot-${index}`,
        name: item.name || "Produit BeautyPlace",
        price: Number(item.price) || 0,
        imgUrl: getProductImage({
          imgUrl: item.imgUrl,
          name: item.name,
        }),
      },
    }));
  } catch {
    return [];
  }
};

function TreatedOrdersContent() {
  const {
    data: reservationsData,
    loading: loadingReservations,
    error: reservationsError,
  } = useQuery(GET_TREATED_RESERVATIONS_ADMIN, {
    fetchPolicy: "network-only",
  });
  const [restoreTreatedReservation, { loading: restoringReservation }] =
    useMutation(RESTORE_TREATED_RESERVATION_ADMIN, {
      refetchQueries: [{ query: GET_TREATED_RESERVATIONS_ADMIN }],
    });
  const [deleteTreatedReservation, { loading: deletingReservation }] =
    useMutation(DELETE_TREATED_RESERVATION_ADMIN, {
      refetchQueries: [{ query: GET_TREATED_RESERVATIONS_ADMIN }],
    });

  const treatedReservations = (
    reservationsData?.getTreatedReservationsAdmin ?? []
  ).filter((reservation: any) => {
    const orderedArticles = getOrderedArticles(reservation);
    const total = orderedArticles.reduce(
      (sum: number, article: any) => sum + (article.product?.price ?? 0),
      0
    );

    return (
      total > 0 &&
      (reservation.archivedByAdmin || reservation.status === "ended")
    );
  });

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <p className="shop-kicker">Archives</p>
        <h1>Commandes traitees</h1>
        <p>
          Retrouvez ici les commandes deja traitees avant leur suppression
          definitive de votre espace administrateur.
        </p>
        <div className="admin-shortcuts">
          <Link href="/admin">Retour admin</Link>
          <Link href="/admin#commandes-clients">Commandes a traiter</Link>
        </div>
      </section>

      <section className="admin-panel admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Terminees</p>
            <h2>Historique des commandes</h2>
          </div>
          <strong>{treatedReservations.length} traitee(s)</strong>
        </div>

        {loadingReservations && <p>Chargement des commandes traitees...</p>}
        {reservationsError && (
          <p>Impossible de charger les commandes traitees.</p>
        )}
        {!loadingReservations && !treatedReservations.length && (
          <p>Aucune commande traitee pour le moment.</p>
        )}

        <div className="orders-table">
          {treatedReservations.map((reservation: any) => {
            const orderedArticles = getOrderedArticles(reservation);
            const total = orderedArticles.reduce(
              (sum: number, article: any) =>
                sum + (article.product?.price ?? 0),
              0
            );
            const productLines = groupArticlesByProduct(orderedArticles);
            const isOnlinePaid =
              reservation.paymentMethod === "card" &&
              reservation.paymentStatus === "paid" &&
              Boolean(reservation.stripeSessionId);
            const deliveryModeLabel =
              deliveryLabels[reservation.deliveryMethod || "home"] ||
              "Livraison a domicile";
            const isArchivedOrder = Boolean(reservation.archivedByAdmin);
            const orderDate = reservation.createdAt
              ? new Date(reservation.createdAt).toLocaleDateString("fr-FR")
              : "date non renseignee";
            const trackingLabel = `${
              reservation.shippingCarrier || "Transporteur a definir"
            } - ${reservation.trackingNumber || "numero a renseigner"}`;
            const pickupLabel = reservation.pickupDate
              ? `${new Date(reservation.pickupDate).toLocaleDateString(
                  "fr-FR"
                )}${
                  reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""
                }`
              : "date non renseignee";

            return (
              <article className="order-row" key={reservation.id}>
                <div className="order-head">
                  <span>Reservation #{reservation.id}</span>
                  <div>
                    <span className="status-pill status-ended">
                      {isArchivedOrder
                        ? "sortie de la liste a traiter"
                        : isOnlinePaid
                        ? "colis livre"
                        : "commande traitee"}
                    </span>
                    <span
                      className={`status-pill payment-${reservation.paymentStatus}`}
                    >
                      {paymentLabels[reservation.paymentStatus] ||
                        reservation.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="order-details-grid">
                  <div>
                    <span className="admin-mini-label">Date commande</span>
                    <strong>{orderDate}</strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Statut</span>
                    <strong>
                      {isArchivedOrder
                        ? "Supprimee de la liste a traiter"
                        : "Commande terminee"}
                    </strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Paiement</span>
                    <strong>
                      {isOnlinePaid ? "Carte bancaire confirmee" : "Paye"}
                    </strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Livraison</span>
                    <strong>{deliveryModeLabel}</strong>
                  </div>
                  {reservation.deliveryMethod === "store" ? (
                    <div>
                      <span className="admin-mini-label">Retrait</span>
                      <strong>{pickupLabel}</strong>
                    </div>
                  ) : (
                    <div>
                      <span className="admin-mini-label">Suivi colis</span>
                      <strong>{trackingLabel}</strong>
                    </div>
                  )}
                </div>

                <div className="order-customer">
                  <span className="admin-mini-label">Client</span>
                  <strong>
                    {reservation.user?.firstname} {reservation.user?.lastname}
                  </strong>
                  <p>Email : {reservation.user?.email}</p>
                  <p>
                    Tel :{" "}
                    {reservation.customerPhone ||
                      reservation.user?.phone ||
                      "non renseigne"}
                  </p>
                  <p>
                    Coordonnees :{" "}
                    {reservation.customerAddress ||
                      reservation.user?.address ||
                      "non renseignee"}
                  </p>
                  <p>Mode : {deliveryModeLabel}</p>
                  {reservation.deliveryMethod === "relay" && (
                    <p>
                      Relais : {reservation.relayName || "non renseigne"} -{" "}
                      {reservation.relayAddress || "adresse non renseignee"}
                    </p>
                  )}
                  {reservation.deliveryMethod === "store" && (
                    <p>
                      Retrait :{" "}
                      {reservation.pickupDate
                        ? `${new Date(
                            reservation.pickupDate
                          ).toLocaleDateString("fr-FR")}${
                            reservation.pickupTime
                              ? ` a ${reservation.pickupTime}`
                              : ""
                          }`
                        : "date non renseignee"}
                    </p>
                  )}
                  {reservation.paymentMethod !== "card" && (
                    <p>
                      Retrait :{" "}
                      {reservation.pickupDate
                        ? `${new Date(
                            reservation.pickupDate
                          ).toLocaleDateString("fr-FR")}${
                            reservation.pickupTime
                              ? ` a ${reservation.pickupTime}`
                              : ""
                          }`
                        : "date non renseignee"}
                    </p>
                  )}
                </div>

                <div className="order-products">
                  <span className="admin-mini-label">Produits commandes</span>
                  <p>
                    {orderedArticles.length} produit(s), {productLines.length}{" "}
                    reference(s) - {formatPrice(total)}
                  </p>
                  <ul>
                    {productLines.length > 0 ? (
                      productLines.map((line) => (
                        <li key={line.productKey}>
                          <img
                            src={getProductImage(line.product)}
                            alt={line.product?.name || "Produit BeautyPlace"}
                            onError={(event) => {
                              event.currentTarget.src = defaultProductImage;
                            }}
                          />
                          <span>{line.product?.name}</span>
                          <span className="order-product-quantity">
                            x{line.quantity}
                          </span>
                          <strong>{formatPrice(line.total)}</strong>
                        </li>
                      ))
                    ) : (
                      <li className="order-product-empty">
                        Donnees produit non disponibles dans cette reservation.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="order-statuses">
                  <span className="admin-mini-label">Traitement</span>
                  <p className="admin-tracking-summary">
                    {isArchivedOrder
                      ? "Commande conservee dans l'historique BeautyPlace."
                      : isOnlinePaid
                      ? "Commande payée en ligne et colis livre au client."
                      : "Commande traitee par BeautyPlace."}
                  </p>
                  {isOnlinePaid && (
                    <p className="admin-tracking-summary">
                      {reservation.shippingCarrier ||
                        "Transporteur non renseigne"}{" "}
                      - {reservation.trackingNumber || "numero non renseigne"}
                    </p>
                  )}
                  <span
                    className={`status-pill ${
                      isOnlinePaid
                        ? "payment-pill"
                        : "payment-pill payment-pill-store"
                    }`}
                  >
                    {isOnlinePaid ? "Paiement confirme" : "Sur place"}
                  </span>
                  <button
                    type="button"
                    className="restore-order-button"
                    disabled={restoringReservation || deletingReservation}
                    onClick={() =>
                      restoreTreatedReservation({
                        variables: {
                          reservationId: reservation.id,
                        },
                      })
                    }
                  >
                    Remettre dans les reservations
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={restoringReservation || deletingReservation}
                    onClick={() =>
                      deleteTreatedReservation({
                        variables: {
                          reservationId: reservation.id,
                        },
                      })
                    }
                  >
                    Supprimer cette commande
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function TreatedOrdersGate() {
  const router = useRouter();
  const { data, loading } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const isAdmin = data?.whoAmI?.isLoggedIn && data?.whoAmI?.role === Role.Admin;

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/connexion-administrateur");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return <p className="auth-message">Verification de vos droits...</p>;
  }

  if (!isAdmin) {
    return null;
  }

  return <TreatedOrdersContent />;
}

export default function AdminCommandesTraiteesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <TreatedOrdersGate />
      <Footer />
    </ApolloProvider>
  );
}
