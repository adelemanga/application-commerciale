import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  CANCEL_RESERVATION,
  CONFIRM_STRIPE_CHECKOUT_SESSION,
  CREATE_STRIPE_CHECKOUT_SESSION,
  DELETE_ARTICLE_FROM_RESERVATION,
  SUBMIT_RESERVATION_TO_ADMIN,
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
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error, refetch } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    { fetchPolicy: "network-only" }
  );
  const [deleteArticleFromReservation, { loading: deleting }] = useMutation(
    DELETE_ARTICLE_FROM_RESERVATION,
    {
      refetchQueries: [
        { query: GET_CURRENT_RESERVATION_BY_USER_ID },
        { query: GET_RESERVATIONS_BY_USER_ID },
      ],
    }
  );
  const [cancelReservation] = useMutation(CANCEL_RESERVATION, {
    refetchQueries: [
      { query: GET_CURRENT_RESERVATION_BY_USER_ID },
      { query: GET_RESERVATIONS_BY_USER_ID },
    ],
  });
  const [submitReservationToAdmin, { loading: submitting }] = useMutation(
    SUBMIT_RESERVATION_TO_ADMIN,
    {
      refetchQueries: [
        { query: GET_CURRENT_RESERVATION_BY_USER_ID },
        { query: GET_RESERVATIONS_BY_USER_ID },
      ],
    }
  );
  const [createStripeCheckoutSession, { loading: redirectingToStripe }] =
    useMutation(CREATE_STRIPE_CHECKOUT_SESSION);
  const [confirmStripeCheckoutSession] = useMutation(
    CONFIRM_STRIPE_CHECKOUT_SESSION,
    {
      refetchQueries: [
        { query: GET_CURRENT_RESERVATION_BY_USER_ID },
        { query: GET_RESERVATIONS_BY_USER_ID },
      ],
    }
  );

  const reservation = data?.getCurrentReservationByUserId?.reservation;
  const totalPrice = data?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const articles = reservation?.articles ?? [];
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;
  const userPhone = userData?.whoAmI?.phone ?? "";
  const userAddress = userData?.whoAmI?.address ?? "";

  useEffect(() => {
    const sessionId = router.query.session_id;
    const payment = router.query.payment;

    if (payment === "cancelled") {
      setMessage("Paiement annule. Votre panier est toujours disponible.");
      router.replace("/panier", undefined, { shallow: true });
      return;
    }

    if (typeof sessionId !== "string") {
      return;
    }

    const confirmPayment = async () => {
      try {
        await confirmStripeCheckoutSession({
          variables: { sessionId },
        });
        await refetch();
        setMessage("Paiement Stripe confirme. La commande est envoyee a l'administrateur.");
        router.replace("/panier", undefined, { shallow: true });
      } catch {
        setMessage("Paiement non confirme par Stripe. Verifiez la transaction.");
      }
    };

    confirmPayment();
  }, [confirmStripeCheckoutSession, refetch, router]);

  const removeArticle = async (articleId: string) => {
    setMessage("");

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
    }
  };

  const sendOrderToAdmin = async () => {
    if (!reservation?.id) {
      setMessage("Ajoutez au moins un produit avant d'envoyer la commande.");
      return;
    }

    const phoneToSend = customerPhone || userPhone;
    const addressToSend = customerAddress || userAddress;

    if (!phoneToSend || !addressToSend) {
      setMessage("Ajoutez votre telephone et votre adresse avant d'envoyer la commande.");
      return;
    }

    if (paymentMethod === "card") {
      try {
        const response = await createStripeCheckoutSession({
          variables: {
            reservationId: reservation.id,
            customerPhone: phoneToSend,
            customerAddress: addressToSend,
          },
        });
        const checkoutUrl = response.data?.createStripeCheckoutSession?.url;

        if (!checkoutUrl) {
          throw new Error("Stripe checkout URL missing");
        }

        window.location.href = checkoutUrl;
      } catch (error: any) {
        const stripeMessage =
          error?.graphQLErrors?.[0]?.message ||
          error?.networkError?.message ||
          error?.message;

        setMessage(
          stripeMessage
            ? `Paiement Stripe impossible : ${stripeMessage}`
            : "Impossible d'ouvrir le paiement Stripe. Verifiez les cles Stripe."
        );
      }
      return;
    }

    try {
      await submitReservationToAdmin({
        variables: {
          reservationId: reservation.id,
          customerPhone: phoneToSend,
          customerAddress: addressToSend,
          paymentMethod,
        },
      });
      await refetch();
      setMessage(
        "Commande envoyee. Le paiement se fera sur place."
      );
    } catch {
      setMessage("Impossible d'envoyer la commande a l'administrateur.");
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

      {message && <p className="shop-message">{message}</p>}
      {(loading || loadingUser) && (
        <p className="shop-message">Chargement du panier...</p>
      )}
      {error && <p className="shop-message">Impossible de charger le panier.</p>}

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
            {articles.map((article: any) => (
              <article className="cart-line" key={article.id}>
                <img src={article.product.imgUrl} alt={article.product.name} />
                <div>
                  <h2>{article.product.name}</h2>
                  <p>{article.product.price ? "Produit ajoute au panier." : ""}</p>
                </div>
                <strong>{formatPrice(article.product.price)}</strong>
                <button
                  type="button"
                  className="danger-button"
                  disabled={deleting}
                  onClick={() => removeArticle(article.id)}
                >
                  Retirer
                </button>
              </article>
            ))}
          </div>
          <aside className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(totalPrice)}</strong>
            <label>
              Telephone
              <input
                required
                type="tel"
                placeholder={userPhone || "Votre numero"}
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </label>
            <label>
              Adresse
              <textarea
                required
                placeholder={userAddress || "Adresse de livraison"}
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
              />
            </label>
            <div className="payment-box">
              <span>Paiement securise</span>
              <div className="payment-choice">
                <button
                  type="button"
                  className={paymentMethod === "card" ? "active" : ""}
                  onClick={() => setPaymentMethod("card")}
                >
                  Carte bancaire
                </button>
                <button
                  type="button"
                  className={paymentMethod === "cash" ? "active" : ""}
                  onClick={() => setPaymentMethod("cash")}
                >
                  Sur place
                </button>
              </div>
              {paymentMethod === "card" ? (
                <>
                  <p>
                    Le paiement par carte se fait sur la page securisee Stripe.
                    Aucune donnee bancaire n'est saisie ni stockee sur ce site.
                  </p>
                </>
              ) : (
                <p>Le client reglera directement sur place. La commande sera marquee a payer.</p>
              )}
            </div>
            <button
              type="button"
              className="cart-submit-button"
              disabled={submitting || redirectingToStripe}
              onClick={sendOrderToAdmin}
            >
              {submitting || redirectingToStripe
                ? "Validation en cours..."
                : paymentMethod === "card"
                  ? `Payer ${formatPrice(totalPrice)} avec Stripe`
                  : "Envoyer et payer sur place"}
            </button>
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
