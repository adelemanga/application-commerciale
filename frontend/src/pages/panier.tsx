import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  CANCEL_RESERVATION,
  DELETE_ARTICLE_FROM_RESERVATION,
} from "../graphql/mutations";
import {
  GET_CURRENT_RESERVATION_BY_USER_ID,
  GET_RESERVATIONS_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

function PanierContent() {
  const [message, setMessage] = useState("");
  const [removingArticleId, setRemovingArticleId] = useState<string | null>(null);
  const pendingArticleIds = useRef<Set<string>>(new Set());
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
  });
  const { data, loading, error, refetch } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: false,
    }
  );
  const [deleteArticleFromReservation] = useMutation(DELETE_ARTICLE_FROM_RESERVATION, {
    refetchQueries: [
      { query: GET_CURRENT_RESERVATION_BY_USER_ID },
      { query: GET_RESERVATIONS_BY_USER_ID },
    ],
  });
  const [cancelReservation] = useMutation(CANCEL_RESERVATION, {
    refetchQueries: [
      { query: GET_CURRENT_RESERVATION_BY_USER_ID },
      { query: GET_RESERVATIONS_BY_USER_ID },
    ],
  });

  const reservation = data?.getCurrentReservationByUserId?.reservation;
  const totalPrice = data?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const articles = useMemo(
    () => reservation?.articles ?? [],
    [reservation?.articles]
  );
  const cartLines = useMemo(() => {
    return articles.reduce((lines: any[], article: any) => {
      const productId = article.product?.id || article.product?.name || article.id;
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
    }, []).sort((firstLine: any, secondLine: any) =>
      String(firstLine.product?.name ?? "").localeCompare(
        String(secondLine.product?.name ?? ""),
        "fr"
      )
    );
  }, [articles]);
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;

  const removeArticle = async (articleId: string) => {
    if (pendingArticleIds.current.has(articleId)) {
      return;
    }

    setMessage("");
    setRemovingArticleId(articleId);
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
      setMessage("Le produit a ete retire du panier.");
    } catch {
      setMessage("Impossible de retirer ce produit du panier.");
    } finally {
      pendingArticleIds.current.delete(articleId);
      setRemovingArticleId(null);
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
        {error && <p className="shop-message">Impossible de charger le panier.</p>}
      </div>

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connectez-vous pour voir votre panier</h2>
          <p>Votre panier est rattache a votre compte client.</p>
          <div>
            <Link href="/connexion-client">Connexion ou inscription</Link>
          </div>
        </section>
      ) : articles.length ? (
        <section className="cart-panel">
          <div className="cart-lines">
            {cartLines.map((line: any) => (
              <article className="cart-line" key={line.productId}>
                <img src={line.product.imgUrl} alt={line.product.name} />
                <div>
                  <h2>{line.product.name}</h2>
                  <div className="cart-line-meta">
                    <span className="quantity-pill">
                      Quantite <strong>{line.quantity}</strong>
                    </span>
                    <span>Prix unite : {formatPrice(line.product.price)}</span>
                  </div>
                </div>
                <strong className="cart-line-total">{formatPrice(line.lineTotal)}</strong>
                <button
                  type="button"
                  className="danger-button"
                  disabled={removingArticleId === line.articles[0].id}
                  onClick={() => removeArticle(line.articles[0].id)}
                >
                  {removingArticleId === line.articles[0].id
                    ? "Retrait..."
                    : "Retirer 1"}
                </button>
              </article>
            ))}
          </div>
          <aside className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(totalPrice)}</strong>
            <div className="payment-box">
              <span>Choisir livraison ou retrait</span>
              <p>
                Toutes les commandes sont payees par carte bancaire. Vous
                choisirez ensuite la livraison a domicile, le point relais ou le
                retrait en magasin.
              </p>
            </div>
            <div className="cart-payment-actions">
              <Link className="cart-submit-button" href="/paiement-carte">
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
