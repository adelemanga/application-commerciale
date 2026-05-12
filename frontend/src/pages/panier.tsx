import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  CANCEL_RESERVATION,
  DELETE_ARTICLE_FROM_RESERVATION,
  HANDLE_RESERVATION,
} from "../graphql/mutations";
import {
  GET_ALL_PRODUCTS,
  GET_CURRENT_RESERVATION_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";
import { defaultProductImage, getProductImage } from "../utils/productImages";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

function PanierContent() {
  const [message, setMessage] = useState("");
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null
  );
  const pendingArticleIds = useRef<Set<string>>(new Set());
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
  });
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;
  const { data, loading, error, refetch } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: false,
    }
  );
  const { data: productsData } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    skip: !isLoggedIn,
  });
  const [deleteArticleFromReservation] = useMutation(
    DELETE_ARTICLE_FROM_RESERVATION
  );
  const [cancelReservation] = useMutation(CANCEL_RESERVATION);
  const [handleReservation] = useMutation(HANDLE_RESERVATION);

  const reservation = data?.getCurrentReservationByUserId?.reservation;
  const totalPrice = data?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const articles = useMemo(
    () => reservation?.articles ?? [],
    [reservation?.articles]
  );
  const cartLines = useMemo(() => {
    return articles
      .filter((article: any) => Number(article.product?.price) > 0)
      .reduce((lines: any[], article: any) => {
        const productId =
          article.product?.id || article.product?.name || article.id;
        const existingLine = lines.find((line) => line.productId === productId);

        if (existingLine) {
          existingLine.articles.push(article);
          existingLine.quantity += 1;
          existingLine.lineTotal += article.product?.price ?? 0;
          return lines;
        }

        lines.push({
          productId,
          product: article.product,
          articles: [article],
          quantity: 1,
          lineTotal: article.product?.price ?? 0,
        });

        return lines;
      }, [])
      .sort((firstLine: any, secondLine: any) =>
        String(firstLine.product?.name ?? "").localeCompare(
          String(secondLine.product?.name ?? ""),
          "fr"
        )
      );
  }, [articles]);
  const productsById = useMemo(() => {
    return (productsData?.getAllProducts ?? []).reduce(
      (products: Record<string, any>, product: any) => {
        products[product.id] = product;
        return products;
      },
      {}
    );
  }, [productsData?.getAllProducts]);

  const removeArticle = async (articleId: string, productId: string) => {
    if (pendingArticleIds.current.has(articleId)) {
      return;
    }

    setMessage("");
    setUpdatingProductId(productId);
    pendingArticleIds.current.add(articleId);

    try {
      await deleteArticleFromReservation({
        variables: { id: articleId },
      });

      if (articles.length === 1 && reservation?.id) {
        await cancelReservation({
          variables: { reservationId: reservation.id },
        });
      }

      await refetch();
    } catch {
      setMessage("Impossible de retirer ce produit du panier.");
    } finally {
      pendingArticleIds.current.delete(articleId);
      setUpdatingProductId(null);
    }
  };

  const removeProductLine = async (line: any) => {
    if (updatingProductId) {
      return;
    }

    setMessage("");
    setUpdatingProductId(line.productId);

    try {
      if (line.articles.length === articles.length && reservation?.id) {
        await cancelReservation({
          variables: { reservationId: reservation.id },
        });
      } else {
        for (const article of line.articles) {
          await deleteArticleFromReservation({
            variables: { id: article.id },
          });
        }
      }

      await refetch();
      setMessage(`${line.product.name} a ete supprime du panier.`);
    } catch {
      setMessage("Impossible de supprimer ce produit du panier.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const payableArticles = useMemo(
    () => articles.filter((article: any) => Number(article.product?.price) > 0),
    [articles]
  );
  const payableTotalPrice = useMemo(
    () =>
      payableArticles.reduce(
        (total: number, article: any) =>
          total + (Number(article.product?.price) || 0),
        0
      ),
    [payableArticles]
  );

  const addArticleToLine = async (line: any) => {
    if (updatingProductId) {
      return;
    }

    setMessage("");
    setUpdatingProductId(line.productId);

    const reservedArticleIds = new Set(
      articles.map((article: any) => article.id)
    );
    const product = productsById[line.productId];
    const articleId = product?.articles?.find(
      (article: any) => !reservedArticleIds.has(article.id)
    )?.id;

    if (!articleId) {
      setMessage("Stock maximum atteint pour ce produit.");
      setUpdatingProductId(null);
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
      await refetch();
    } catch {
      setMessage("Impossible d'ajouter une unite de ce produit.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  return (
    <main className="shop-page cart-page">
      <section className="shop-hero">
        <p className="shop-kicker">Votre selection</p>
        <h1>Panier</h1>
        <p>
          Retrouvez les produits selectionnes, les prix issus de la base de
          donnees et le total de votre panier.
        </p>
      </section>

      <div className="shop-message-slot">
        {message && <p className="shop-message">{message}</p>}
        {(loading || loadingUser) && !reservation && (
          <p className="shop-message">Chargement du panier...</p>
        )}
        {error && (
          <p className="shop-message">Impossible de charger le panier.</p>
        )}
      </div>

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connectez-vous pour voir votre panier</h2>
          <p>Votre panier est rattache a votre compte client.</p>
          <div className="auth-link-row">
            <Link href="/connexion-client">Connexion</Link>
            <Link href="/inscription-client">Inscription</Link>
          </div>
        </section>
      ) : articles.length ? (
        <section className="cart-panel">
          <div className="cart-lines">
            {cartLines.map((line: any) => (
              <article className="cart-line" key={line.productId}>
                <img
                  src={getProductImage(line.product)}
                  alt={line.product.name}
                  onError={(event) => {
                    event.currentTarget.src = defaultProductImage;
                  }}
                />
                <div>
                  <h2>{line.product.name}</h2>
                  <div className="cart-line-meta">
                    <span className="quantity-pill">
                      Quantite <strong>{line.quantity}</strong>
                    </span>
                    <span>Prix unite : {formatPrice(line.product.price)}</span>
                  </div>
                </div>
                <strong className="cart-line-total">
                  {formatPrice(line.lineTotal)}
                </strong>
                <div className="cart-line-actions">
                  <div
                    className="cart-quantity-actions"
                    aria-label="Modifier la quantite"
                  >
                    <button
                      type="button"
                      aria-disabled={updatingProductId === line.productId}
                      onClick={() =>
                        removeArticle(line.articles[0].id, line.productId)
                      }
                      aria-label={`Reduire la quantite de ${line.product.name}`}
                    >
                      -
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      aria-disabled={updatingProductId === line.productId}
                      onClick={() => addArticleToLine(line)}
                      aria-label={`Augmenter la quantite de ${line.product.name}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="danger-button remove-line-button"
                    aria-disabled={updatingProductId === line.productId}
                    onClick={() => removeProductLine(line)}
                  >
                    Supprimer ce produit
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(payableTotalPrice || totalPrice)}</strong>
            {!payableArticles.length && (
              <p className="shop-message">
                Une commande a zero euro ne peut pas exister.
              </p>
            )}
            <div className="payment-box">
              <span>Choisir livraison ou retrait</span>
              <p>
                Toutes les commandes sont payées par carte bancaire. Vous
                choisirez ensuite la livraison a domicile, le point relais ou le
                retrait en magasin.
              </p>
            </div>
            <div className="cart-payment-actions">
              <Link
                className={
                  payableArticles.length
                    ? "cart-submit-button"
                    : "cart-submit-button disabled-link"
                }
                href={payableArticles.length ? "/paiement-carte" : "/produits"}
              >
                Choisir livraison et payer
              </Link>
            </div>
            <Link href="/produits">Continuer mes achats</Link>
          </aside>
        </section>
      ) : (
        <section className="empty-cart-panel">
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits depuis la boutique beaute.</p>
          <Link href="/produits">Voir les produits</Link>
        </section>
      )}
    </main>
  );
}

export default function PanierPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <PanierContent />
      <Footer />
    </ApolloProvider>
  );
}
