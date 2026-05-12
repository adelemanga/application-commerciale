import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { HIDE_RESERVATION_FROM_CLIENT } from "../graphql/mutations";
import { GET_RESERVATIONS_BY_USER_ID, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";
import { defaultProductImage, getProductImage } from "../utils/productImages";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const statusLabels: Record<string, string> = {
  submitted: "Commande recue",
  validated: "Validee par BeautyPlace",
  ongoing: "En preparation",
  shipped: "Colis envoye",
  ended: "Colis livre / commande terminee",
};

const deliveryLabels: Record<string, string> = {
  home: "Livraison a domicile",
  relay: "Point relais",
  store: "Retrait magasin",
};

const groupArticlesByProduct = (articles: any[] = []) =>
  articles.reduce((groups: any[], article: any) => {
    const product = {
      ...(article.product ?? {}),
      imgUrl: getProductImage(article.product),
    };
    const productKey = product.id || product.name || article.id;
    const existingGroup = groups.find((group) => group.productKey === productKey);

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
  if (reservation?.articles?.length) {
    return reservation.articles.map((article: any) => ({
      ...article,
      product: {
        ...article.product,
        imgUrl: getProductImage(article.product),
      },
    }));
  }

  if (!reservation?.articlesSnapshot) {
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

function ClientOrderHistoryContent() {
  const router = useRouter();
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const {
    data: historyData,
    loading: loadingHistory,
    error: historyError,
  } = useQuery(GET_RESERVATIONS_BY_USER_ID, {
    fetchPolicy: "network-only",
  });
  const [hideReservationFromClient, { loading: deletingInvoice }] =
    useMutation(HIDE_RESERVATION_FROM_CLIENT, {
      refetchQueries: [{ query: GET_RESERVATIONS_BY_USER_ID }],
    });

  const user = userData?.whoAmI;
  const isClient =
    Boolean(user?.isLoggedIn) && user?.role === Role.User;

  useEffect(() => {
    if (!loadingUser && !isClient) {
      router.replace("/connexion-client");
    }
  }, [isClient, loadingUser, router]);

  if (loadingUser) {
    return <p className="auth-message">Verification de votre compte...</p>;
  }

  if (!isClient) {
    return null;
  }

  const paidOrders = (historyData?.getReservationsByUserId ?? []).filter(
    (item: any) => {
      const articles = getOrderedArticles(item.reservation);

      return (
        item.reservation?.paymentStatus === "paid" &&
        articles.length > 0 &&
        item.totalPrice > 0
      );
    }
  );

  const deleteInvoiceFromHistory = async (reservationId: string) => {
    await hideReservationFromClient({
      variables: {
        reservationId,
      },
    });
  };

  return (
    <main className="admin-page client-history-page">
      <section className="admin-hero">
        <p className="shop-kicker">Espace client</p>
        <h1>Historique des commandes</h1>
        <p>
          Retrouvez ici uniquement vos commandes payees, avec les produits, les
          images, les prix et l'acces au suivi ou a la facture.
        </p>
        <div className="admin-shortcuts">
          <Link href="/clients">Retour espace client</Link>
          <Link href="/suivi-commandes">Suivi et facture</Link>
          <Link href="/panier">Panier</Link>
        </div>
      </section>

      <section className="admin-panel admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Commandes payees</p>
            <h2>Mes achats</h2>
          </div>
          <strong>{paidOrders.length} commande(s)</strong>
        </div>

        {loadingHistory && <p>Chargement de votre historique...</p>}
        {historyError && <p>Impossible de charger votre historique.</p>}
        {!loadingHistory && !paidOrders.length && (
          <p>Aucune commande payee dans votre historique pour le moment.</p>
        )}

        <div className="orders-table">
          {paidOrders.map((item: any) => {
            const reservation = item.reservation;
            const orderedArticles = getOrderedArticles(reservation);
            const productLines = groupArticlesByProduct(orderedArticles);
            const orderDate = reservation.createdAt
              ? new Date(reservation.createdAt).toLocaleDateString("fr-FR")
              : "date non renseignee";
            const deliveryLabel =
              deliveryLabels[reservation.deliveryMethod || "home"] ||
              "Livraison a domicile";

            return (
              <article className="order-row" key={reservation.id}>
                <div className="order-head">
                  <span>Commande #{reservation.id}</span>
                  <div>
                    <span className="status-pill payment-paid">Payee</span>
                    <span className={`status-pill status-${reservation.status}`}>
                      {statusLabels[reservation.status] || reservation.status}
                    </span>
                  </div>
                </div>

                <div className="order-details-grid">
                  <div>
                    <span className="admin-mini-label">Date</span>
                    <strong>{orderDate}</strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Livraison</span>
                    <strong>{deliveryLabel}</strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Total</span>
                    <strong>{formatPrice(item.totalPrice)}</strong>
                  </div>
                  <div>
                    <span className="admin-mini-label">Suivi</span>
                    <strong>
                      {reservation.shippingCarrier || "Transporteur a venir"}
                    </strong>
                    <p>{reservation.trackingNumber || "Numero a venir"}</p>
                  </div>
                </div>

                <div className="order-products">
                  <span className="admin-mini-label">Produits commandes</span>
                  <p>
                    {orderedArticles.length} produit(s), {productLines.length}{" "}
                    reference(s) - {formatPrice(item.totalPrice)}
                  </p>
                  <ul>
                    {productLines.map((line: any) => (
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
                    ))}
                  </ul>
                </div>

                <div className="order-statuses">
                  <span className="admin-mini-label">Actions</span>
                  <Link
                    className="restore-order-button"
                    href={`/suivi-commandes?commande=${reservation.id}`}
                  >
                    Voir le suivi et la facture
                  </Link>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={deletingInvoice}
                    onClick={() => deleteInvoiceFromHistory(reservation.id)}
                  >
                    {deletingInvoice
                      ? "Suppression..."
                      : "Supprimer cette facture"}
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

export default function HistoriqueCommandesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ClientOrderHistoryContent />
      <Footer />
    </ApolloProvider>
  );
}
