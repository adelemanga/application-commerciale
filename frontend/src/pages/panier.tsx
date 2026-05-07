import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  CANCEL_RESERVATION,
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

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

const formatCardExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = false;

  if (digits.length < 13 || digits.length > 16) {
    return false;
  }

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const isValidExpiry = (value: string) => {
  const [monthValue, yearValue] = value.split("/");
  const month = Number(monthValue);
  const year = Number(`20${yearValue}`);

  if (!month || month < 1 || month > 12 || !yearValue || yearValue.length !== 2) {
    return false;
  }

  const expiryDate = new Date(year, month);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return expiryDate > currentMonth;
};

function PanierContent() {
  const [message, setMessage] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
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

  const reservation = data?.getCurrentReservationByUserId?.reservation;
  const totalPrice = data?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const articles = reservation?.articles ?? [];
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;
  const userPhone = userData?.whoAmI?.phone ?? "";
  const userAddress = userData?.whoAmI?.address ?? "";

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
      const cleanCardNumber = cardNumber.replace(/\s/g, "");

      if (!cardName.trim()) {
        setMessage("Ajoutez le nom indique sur la carte.");
        return;
      }

      if (!isValidCardNumber(cardNumber)) {
        setMessage("Numero de carte invalide. Pour tester, utilisez 4242 4242 4242 4242.");
        return;
      }

      if (!isValidExpiry(cardExpiry)) {
        setMessage("Date d'expiration invalide.");
        return;
      }

      if (!/^\d{3,4}$/.test(cardCvc.trim())) {
        setMessage("CVC invalide.");
        return;
      }

      setPaymentNotice(`Carte test terminee par ${cleanCardNumber.slice(-4)} acceptee.`);
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
        paymentMethod === "card"
          ? "Paiement carte accepte. La commande est envoyee a l'administrateur."
          : "Commande envoyee. Le paiement se fera sur place."
      );
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
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
                  <label>
                    Nom sur la carte
                    <input
                      required
                      autoComplete="cc-name"
                      placeholder="ADELE MANGA"
                      value={cardName}
                      onChange={(event) => setCardName(event.target.value)}
                    />
                  </label>
                  <label>
                    Numero de carte
                    <input
                      required
                      autoComplete="cc-number"
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(event) =>
                        setCardNumber(formatCardNumber(event.target.value))
                      }
                    />
                  </label>
                  <div className="payment-row">
                    <label>
                      Expiration
                      <input
                        required
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(event) =>
                          setCardExpiry(formatCardExpiry(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      CVC
                      <input
                        required
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(event) =>
                          setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                      />
                    </label>
                  </div>
                  {paymentNotice && (
                    <p className="payment-success">{paymentNotice}</p>
                  )}
                  <p>
                    Paiement carte en mode test. Aucun debit bancaire reel.
                    Carte de test : 4242 4242 4242 4242.
                  </p>
                </>
              ) : (
                <p>Le client reglera directement sur place. La commande sera marquee a payer.</p>
              )}
            </div>
            <button
              type="button"
              className="cart-submit-button"
              disabled={submitting}
              onClick={sendOrderToAdmin}
            >
              {submitting
                ? "Validation en cours..."
                : paymentMethod === "card"
                  ? `Payer ${formatPrice(totalPrice)} et envoyer`
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
