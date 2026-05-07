import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import client from "../graphql/client";
import { HANDLE_RESERVATION } from "../graphql/mutations";
import {
  GET_ALL_PRODUCTS,
  GET_CURRENT_RESERVATION_BY_USER_ID,
  GET_RESERVATIONS_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";
import { Product } from "../interface/types";

type ProductWithArticles = Product & {
  articles?: { id: string }[];
};

function ClientsContent() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [message, setMessage] = useState("");
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);

  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS);
  const { data: userData } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data: cartData, refetch: refetchCart } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    { fetchPolicy: "network-only" }
  );
  const { data: historyData, refetch: refetchHistory } = useQuery(
    GET_RESERVATIONS_BY_USER_ID,
    { fetchPolicy: "network-only" }
  );
  const [handleReservation, { loading: ordering }] = useMutation(HANDLE_RESERVATION, {
    refetchQueries: [
      { query: GET_CURRENT_RESERVATION_BY_USER_ID },
      { query: GET_RESERVATIONS_BY_USER_ID },
    ],
  });

  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data]
  );
  const user = userData?.whoAmI;
  const isLoggedIn = Boolean(user?.isLoggedIn);
  const orderHistory = historyData?.getReservationsByUserId ?? [];
  const likedProducts = products.filter((product) =>
    likedProductIds.includes(product.id)
  );

  useEffect(() => {
    if (!user?.email) return;

    const savedLikes = window.localStorage.getItem(
      `liked-products-${user.email}`
    );
    setLikedProductIds(savedLikes ? JSON.parse(savedLikes) : []);
  }, [user?.email]);

  const saveLikedProducts = (nextLikedProductIds: string[]) => {
    setLikedProductIds(nextLikedProductIds);
    if (user?.email) {
      window.localStorage.setItem(
        `liked-products-${user.email}`,
        JSON.stringify(nextLikedProductIds)
      );
    }
  };

  const toggleLike = (productId: string) => {
    const nextLikedProductIds = likedProductIds.includes(productId)
      ? likedProductIds.filter((id) => id !== productId)
      : [...likedProductIds, productId];

    saveLikedProducts(nextLikedProductIds);
  };

  const orderProduct = async (product: ProductWithArticles) => {
    setMessage("");

    if (!isLoggedIn) {
      setMessage("Connectez-vous ou creez un compte avant d'ajouter au panier.");
      return;
    }

    const articleId = product.articles?.[0]?.id;

    if (!articleId) {
      setMessage("Ce produit n'a pas encore de stock disponible.");
      return;
    }

    try {
      await handleReservation({
        variables: {
          data: {
            articleId,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
          },
        },
      });
      await refetchCart();
      await refetchHistory();
      setMessage(`${product.name} a bien ete ajoute a votre commande.`);
    } catch {
      setMessage("Connectez-vous avant de commander un produit.");
    }
  };

  const reservation = cartData?.getCurrentReservationByUserId?.reservation;
  const totalPrice = cartData?.getCurrentReservationByUserId?.totalPrice ?? 0;

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <p className="shop-kicker">Espace clients</p>
        <h1>
          {user?.isLoggedIn
            ? `Bonjour ${user.firstname || user.email}`
            : "Commander des produits"}
        </h1>
        <p>
          Retrouvez votre panier, vos commandes precedentes et vos produits
          preferes dans votre espace client.
        </p>
      </section>

      {isLoggedIn && (
        <section className="client-profile-panel">
          <div className="client-profile-identity">
            <img
              className="client-profile-avatar"
              src={
                user.avatarUrl ||
                "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3383.jpg"
              }
              alt={`${user.firstname || "Client"} ${user.lastname || ""}`}
            />
            <div>
            <p className="shop-kicker">Profil connecte</p>
            <h2>
              {user.firstname} {user.lastname}
            </h2>
            <p>{user.email}</p>
            {user.phone && <p>Telephone : {user.phone}</p>}
            {user.address && <p>Adresse : {user.address}</p>}
            </div>
          </div>
          <div className="client-profile-stats">
            <strong>{orderHistory.length}</strong>
            <span>commande(s)</span>
          </div>
          <div className="client-profile-stats">
            <strong>{likedProducts.length}</strong>
            <span>produit(s) like(s)</span>
          </div>
        </section>
      )}

      <section className="shop-controls" aria-label="Dates de commande">
        <label>
          Debut
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          Fin
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </section>

      {message && <p className="shop-message">{message}</p>}
      {loading && <p className="shop-message">Chargement des produits...</p>}
      {error && <p className="shop-message">Impossible de charger les produits.</p>}

      {!isLoggedIn && (
        <section className="shop-auth-callout">
          <p>Pour commander un produit, connectez-vous ou creez un compte client.</p>
          <div>
            <Link href="/connexion-client">Connexion ou inscription</Link>
          </div>
        </section>
      )}

      <section className="shop-layout">
        <div className="product-grid">
          {products.map((product) => (
            <article className="shop-card" key={product.id}>
              <img src={product.imgUrl} alt={product.name} />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <strong>{product.price ?? 0} EUR</strong>
                <div className="shop-card-actions">
                  <button
                    type="button"
                    onClick={() => orderProduct(product)}
                    disabled={ordering}
                  >
                    Commander
                  </button>
                  <button
                    type="button"
                    className={
                      likedProductIds.includes(product.id)
                        ? "like-button liked"
                        : "like-button"
                    }
                    onClick={() => toggleLike(product.id)}
                    aria-label={
                      likedProductIds.includes(product.id)
                        ? "Retirer des produits likes"
                        : "Ajouter aux produits likes"
                    }
                  >
                    {likedProductIds.includes(product.id) ? "Aime" : "Like"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="order-summary">
          <h2>Commande en cours</h2>
          {reservation?.articles?.length ? (
            <>
              <ul>
                {reservation.articles.map((article: any) => (
                  <li key={article.id}>
                    <span>{article.product.name}</span>
                    <strong>{article.product.price} EUR</strong>
                  </li>
                ))}
              </ul>
              <p className="order-total">Total : {totalPrice} EUR</p>
            </>
          ) : (
            <p>Aucun produit dans la commande pour le moment.</p>
          )}
        </aside>
      </section>

      <section className="client-space-grid">
        <article className="client-panel">
          <h2>Historique des commandes</h2>
          {orderHistory.length ? (
            <div className="client-history-list">
              {orderHistory.map((item: any) => (
                <div className="client-history-card" key={item.reservation.id}>
                  <div>
                    <strong>
                      Commande du{" "}
                      {new Date(item.reservation.createdAt).toLocaleDateString(
                        "fr-FR"
                      )}
                    </strong>
                    <p>
                      Statut : {item.reservation.status} - Total :{" "}
                      {item.totalPrice} EUR
                    </p>
                  </div>
                  <ul>
                    {item.reservation.articles.map((article: any) => (
                      <li key={article.id}>
                        <img
                          src={article.product?.imgUrl}
                          alt={article.product?.name}
                        />
                        <span>{article.product?.name}</span>
                        <strong>{article.product?.price} EUR</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p>Aucune commande dans votre historique pour le moment.</p>
          )}
        </article>

        <article className="client-panel">
          <h2>Produits likes</h2>
          {likedProducts.length ? (
            <div className="liked-products-list">
              {likedProducts.map((product) => (
                <div className="liked-product" key={product.id}>
                  <img src={product.imgUrl} alt={product.name} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.price ?? 0} EUR</p>
                  </div>
                  <button type="button" onClick={() => toggleLike(product.id)}>
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>Aucun produit like pour le moment.</p>
          )}
        </article>
      </section>
    </main>
  );
}

export default function ClientsPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ClientsContent />
      <Footer />
    </ApolloProvider>
  );
}
