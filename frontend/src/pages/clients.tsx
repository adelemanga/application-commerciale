import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Product, Role } from "../interface/types";

type ProductWithArticles = Product & {
  articles?: { id: string }[];
};

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

function ClientsContent() {
  const [message, setMessage] = useState("");
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const [orderingProductId, setOrderingProductId] = useState<string | null>(null);
  const pendingProductIds = useRef<Set<string>>(new Set());

  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
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
  const [handleReservation] = useMutation(HANDLE_RESERVATION, {
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
  const isClient = isLoggedIn && user?.role === Role.User;
  const isAdmin = isLoggedIn && user?.role === Role.Admin;
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
    if (pendingProductIds.current.has(product.id)) {
      return;
    }

    setMessage("");
    setOrderingProductId(product.id);
    pendingProductIds.current.add(product.id);

    if (!isLoggedIn) {
      setMessage("Connectez-vous ou creez un compte avant d'ajouter au panier.");
      pendingProductIds.current.delete(product.id);
      setOrderingProductId(null);
      return;
    }

    const reservedArticleIds = new Set(
      reservation?.articles?.map((article: any) => article.id) ?? []
    );
    const articleId = product.articles?.find(
      (article) => !reservedArticleIds.has(article.id)
    )?.id;

    if (!articleId) {
      setMessage("Toutes les unites disponibles de ce produit sont deja dans votre panier.");
      pendingProductIds.current.delete(product.id);
      setOrderingProductId(null);
      return;
    }

    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);

    try {
      await handleReservation({
        variables: {
          data: {
            articleId,
            startDate: today.toISOString(),
            endDate: tomorrow.toISOString(),
          },
        },
      });
      await refetchCart();
      await refetchHistory();
      setMessage(`${product.name} a bien ete ajoute a votre commande.`);
    } catch {
      setMessage("Connectez-vous avant de commander un produit.");
    } finally {
      pendingProductIds.current.delete(product.id);
      setOrderingProductId(null);
    }
  };

  const reservation = cartData?.getCurrentReservationByUserId?.reservation;
  const totalPrice = cartData?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const cartLines = useMemo(() => {
    return (reservation?.articles ?? []).reduce((lines: any[], article: any) => {
      const productId = article.product?.id || article.product?.name || article.id;
      const existingLine = lines.find((line) => line.productId === productId);

      if (existingLine) {
        existingLine.quantity += 1;
        existingLine.lineTotal += article.product?.price ?? 0;
        return lines;
      }

      lines.push({
        productId,
        product: article.product,
        quantity: 1,
        lineTotal: article.product?.price ?? 0,
      });

      return lines;
    }, []).sort((firstLine: any, secondLine: any) =>
      String(firstLine.product?.name ?? "").localeCompare(
        String(secondLine.product?.name ?? ""),
        "fr"
      )
    );
  }, [reservation?.articles]);

  return (
    <main className="shop-page">
      <section className={isClient ? "shop-hero client-welcome-hero" : "shop-hero"}>
        {isClient && (
          <img
            className="client-welcome-avatar"
            src={
              user.avatarUrl ||
              "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3383.jpg"
            }
            alt={`${user.firstname || "Client"} ${user.lastname || ""}`}
          />
        )}
        <div>
          <p className="shop-kicker">Espace clients</p>
          <h1>
            {isClient
              ? `${user.firstname || "Client"} ${user.lastname || ""}`
              : "Commander des produits"}
          </h1>
          <p>
            {isClient
              ? "Votre profil, vos reservations et vos produits preferes sont regroupes ici."
              : "Connectez-vous avec un compte client pour voir votre profil et vos reservations."}
          </p>
        </div>
      </section>

      {isClient && (
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
              <p className="shop-kicker profile-kicker-connected">
                Profil connecte
                <span className="connected-dot" aria-label="Connecte" />
              </p>
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

      {isAdmin && (
        <section className="shop-auth-callout">
          <p>
            Vous etes connectee avec un compte administrateur. Cette page est
            reservee aux comptes clients.
          </p>
          <div>
            <Link href="/admin">Aller a l'interface admin</Link>
          </div>
        </section>
      )}

      <div className="shop-message-slot">
        {message && <p className="shop-message">{message}</p>}
        {loading && <p className="shop-message">Chargement des produits...</p>}
        {error && <p className="shop-message">Impossible de charger les produits.</p>}
      </div>

      {!loadingUser && !isLoggedIn && (
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
                    className="order-product-button"
                    onClick={() => orderProduct(product)}
                    disabled={orderingProductId === product.id}
                    aria-busy={orderingProductId === product.id}
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
                {cartLines.map((line: any) => (
                  <li key={line.productId}>
                    <span className="mini-cart-product-name">{line.product.name}</span>
                    <span className="mini-cart-quantity">
                      x<strong>{line.quantity}</strong>
                    </span>
                    <strong>{formatPrice(line.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <p className="order-total">Total : {formatPrice(totalPrice)}</p>
              <Link className="cart-link" href="/panier">
                Acceder au panier
              </Link>
            </>
          ) : (
            <>
              <p>Aucun produit dans la commande pour le moment.</p>
              <Link className="cart-link" href="/panier">
                Voir mon panier
              </Link>
            </>
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
                    <p>Statut : {item.reservation.status}</p>
                    {item.reservation.status !== "pending" && (
                      <Link href={`/suivi-commandes?commande=${item.reservation.id}`}>
                        Voir le recu et le suivi
                      </Link>
                    )}
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
                  <p className="client-history-total">
                    Total commande : <strong>{formatPrice(item.totalPrice)}</strong>
                  </p>
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
