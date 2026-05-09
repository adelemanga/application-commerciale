import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { DELETE_TREATED_RESERVATION_ADMIN } from "../graphql/mutations";
import { GET_ALL_RESERVATIONS, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const paymentLabels: Record<string, string> = {
  pending: "a payer",
  paid: "paye",
};

function TreatedOrdersContent() {
  const {
    data: reservationsData,
    loading: loadingReservations,
    error: reservationsError,
  } = useQuery(GET_ALL_RESERVATIONS, {
    fetchPolicy: "network-only",
  });
  const [deleteTreatedReservation, { loading: deletingReservation }] =
    useMutation(DELETE_TREATED_RESERVATION_ADMIN, {
      refetchQueries: [{ query: GET_ALL_RESERVATIONS }],
    });

  const treatedReservations = (reservationsData?.getAllReservations ?? []).filter(
    (reservation: any) => {
      const total = reservation.articles.reduce(
        (sum: number, article: any) => sum + (article.product?.price ?? 0),
        0
      );
      const isTreatedPickup =
        reservation.paymentStatus === "paid" && !reservation.stripeSessionId;

      return (
        (reservation.status === "ended" || isTreatedPickup) &&
        reservation.articles.length > 0 &&
        total > 0
      );
    }
  );

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <p className="shop-kicker">Archives</p>
        <h1>Commandes traitees</h1>
        <p>
          Retrouvez ici les colis livres et les commandes retirees sur place.
          Elles ne sont plus dans la liste a traiter.
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
        {reservationsError && <p>Impossible de charger les commandes traitees.</p>}
        {!loadingReservations && !treatedReservations.length && (
          <p>Aucune commande traitee pour le moment.</p>
        )}

        <div className="orders-table">
          {treatedReservations.map((reservation: any) => {
            const total = reservation.articles.reduce(
              (sum: number, article: any) => sum + (article.product?.price ?? 0),
              0
            );
            const isOnlinePaid =
              reservation.paymentMethod === "card" &&
              reservation.paymentStatus === "paid" &&
              Boolean(reservation.stripeSessionId);

            return (
              <article className="order-row" key={reservation.id}>
                <div className="order-head">
                  <span>Reservation #{reservation.id}</span>
                  <div>
                    <span className="status-pill status-ended">
                      {isOnlinePaid ? "colis livre" : "retiree sur place"}
                    </span>
                    <span className={`status-pill payment-${reservation.paymentStatus}`}>
                      {paymentLabels[reservation.paymentStatus] ||
                        reservation.paymentStatus}
                    </span>
                  </div>
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
                    Adresse :{" "}
                    {reservation.customerAddress ||
                      reservation.user?.address ||
                      "non renseignee"}
                  </p>
                </div>

                <div className="order-products">
                  <span className="admin-mini-label">Produits commandes</span>
                  <p>
                    Du{" "}
                    {new Date(reservation.startDate).toLocaleDateString("fr-FR")} au{" "}
                    {new Date(reservation.endDate).toLocaleDateString("fr-FR")}
                  </p>
                  <p>
                    {reservation.articles.length} produit(s) - {formatPrice(total)}
                  </p>
                  <ul>
                    {reservation.articles.map((article: any) => (
                      <li key={article.id}>
                        <img
                          src={article.product?.imgUrl}
                          alt={article.product?.name}
                        />
                        <span>{article.product?.name}</span>
                        <strong>{formatPrice(article.product?.price)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-statuses">
                  <span className="admin-mini-label">Traitement</span>
                  <p className="admin-tracking-summary">
                    {isOnlinePaid
                      ? "Commande payee en ligne et colis livre au client."
                      : "Commande reservee, payee et retiree sur place."}
                  </p>
                  {isOnlinePaid && (
                    <p className="admin-tracking-summary">
                      {reservation.shippingCarrier || "Transporteur non renseigne"} -{" "}
                      {reservation.trackingNumber || "numero non renseigne"}
                    </p>
                  )}
                  <span className="status-pill payment-pill">
                    {isOnlinePaid ? "Paiement CB" : "Paiement sur place"}
                  </span>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={deletingReservation}
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
  const isAdmin =
    data?.whoAmI?.isLoggedIn && data?.whoAmI?.role === Role.Admin;

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
