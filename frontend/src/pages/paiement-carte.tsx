import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import MondialRelayPicker from "@/components/MondialRelayPicker";
import client from "../graphql/client";
import {
  CONFIRM_STRIPE_CHECKOUT_SESSION,
  CREATE_STRIPE_CHECKOUT_SESSION,
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

function PaiementCarteContent() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("home");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [relayName, setRelayName] = useState("");
  const [relayAddress, setRelayAddress] = useState("");
  const prefilledRef = useRef(false);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_CURRENT_RESERVATION_BY_USER_ID, {
    fetchPolicy: "network-only",
  });
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

  useEffect(() => {
    if (!userData?.whoAmI || prefilledRef.current) return;

    setFirstname(userData.whoAmI.firstname || "");
    setLastname(userData.whoAmI.lastname || "");
    setCustomerPhone(userData.whoAmI.phone || "");
    setCustomerAddress(userData.whoAmI.address || "");
    prefilledRef.current = true;
  }, [userData]);

  useEffect(() => {
    const sessionId = router.query.session_id;
    const payment = router.query.payment;

    if (payment === "cancelled") {
      setMessage("Paiement annule. Votre panier est toujours disponible.");
      router.replace("/paiement-carte", undefined, { shallow: true });
      return;
    }

    if (typeof sessionId !== "string") {
      return;
    }

    const confirmPayment = async () => {
      try {
        const response = await confirmStripeCheckoutSession({
          variables: { sessionId },
        });
        const reservationId = response.data?.confirmStripeCheckoutSession?.id;
        router.replace(
          reservationId
            ? `/suivi-commandes?commande=${reservationId}`
            : "/suivi-commandes"
        );
      } catch {
        setMessage("Paiement non confirme par Stripe. Verifiez la transaction.");
      }
    };

    confirmPayment();
  }, [confirmStripeCheckoutSession, router]);

  const openStripeCheckout = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!reservation?.id || !articles.length) {
      setMessage("Votre panier est vide.");
      return;
    }

    if (!firstname || !lastname || !customerPhone) {
      setMessage("Remplissez votre nom, prenom et telephone.");
      return;
    }

    if (deliveryMethod === "home" && !customerAddress) {
      setMessage("Renseignez votre adresse de livraison.");
      return;
    }

    if (deliveryMethod === "store" && !pickupDate) {
      setMessage("Choisissez une date de retrait en magasin.");
      return;
    }

    if (deliveryMethod === "relay" && (!relayName || !relayAddress)) {
      setMessage("Renseignez le nom et l'adresse du point relais.");
      return;
    }

    try {
      const response = await createStripeCheckoutSession({
        variables: {
          reservationId: reservation.id,
          customerPhone,
          customerAddress:
            deliveryMethod === "relay" ? relayAddress : customerAddress,
          deliveryMethod,
          pickupDate: deliveryMethod === "store" ? pickupDate : null,
          pickupTime: deliveryMethod === "store" ? pickupTime : null,
          relayName: deliveryMethod === "relay" ? relayName : null,
          relayAddress: deliveryMethod === "relay" ? relayAddress : null,
          frontendUrl: window.location.origin,
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
  };

  return (
    <main className="shop-page cart-page">
      <section className="shop-hero">
        <p className="shop-kicker">Paiement securise</p>
        <h1>Paiement par carte bancaire</h1>
        <p>
          Choisissez la livraison ou le retrait, puis validez le paiement Stripe.
        </p>
      </section>

      <div className="shop-message-slot">
        {message && <p className="shop-message">{message}</p>}
        {(loading || loadingUser) && (
          <p className="shop-message">Chargement du paiement...</p>
        )}
        {error && <p className="shop-message">Impossible de charger le panier.</p>}
      </div>

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connectez-vous pour payer</h2>
          <p>Le paiement est rattache a votre compte client.</p>
          <Link href="/connexion-client">Connexion ou inscription</Link>
        </section>
      ) : articles.length ? (
        <section className="checkout-layout">
          <form className="checkout-form-card" onSubmit={openStripeCheckout}>
            <label>
              Prenom
              <input
                required
                name="firstname"
                placeholder="Votre prenom"
                value={firstname}
                onChange={(event) => setFirstname(event.target.value)}
              />
            </label>
            <label>
              Nom
              <input
                required
                name="lastname"
                placeholder="Votre nom"
                value={lastname}
                onChange={(event) => setLastname(event.target.value)}
              />
            </label>
            <label>
              Telephone
              <input
                required
                name="phone"
                type="tel"
                placeholder="Votre numero"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </label>
            <div className="checkout-wide-field delivery-choice-group">
              <span>Mode de reception</span>
              <div className="delivery-choice-buttons">
                <button
                  type="button"
                  className={deliveryMethod === "home" ? "active" : ""}
                  onClick={() => setDeliveryMethod("home")}
                >
                  A domicile
                </button>
                <button
                  type="button"
                  className={deliveryMethod === "relay" ? "active" : ""}
                  onClick={() => setDeliveryMethod("relay")}
                >
                  Point relais
                </button>
                <button
                  type="button"
                  className={deliveryMethod === "store" ? "active" : ""}
                  onClick={() => setDeliveryMethod("store")}
                >
                  Retrait magasin
                </button>
              </div>
            </div>

            {deliveryMethod === "home" && (
              <div className="checkout-wide-field">
                <AddressAutocomplete
                  required
                  label="Adresse de livraison"
                  name="address"
                  value={customerAddress}
                  onChange={setCustomerAddress}
                  placeholder="Region, ville, code postal, rue ou adresse complete"
                />
              </div>
            )}

            {deliveryMethod === "relay" && (
              <>
                <div className="checkout-wide-field">
                  <MondialRelayPicker
                    onSelect={(name, address) => {
                      setRelayName(name);
                      setRelayAddress(address);
                    }}
                  />
                </div>
                <label>
                  Nom du point relais
                  <input
                    required
                    name="relayName"
                    placeholder="Ex: Relais Beauty Centre"
                    value={relayName}
                    onChange={(event) => setRelayName(event.target.value)}
                  />
                </label>
                <div className="relay-address-field">
                  <AddressAutocomplete
                    required
                    label="Adresse du point relais"
                    name="relayAddress"
                    value={relayAddress}
                    onChange={setRelayAddress}
                    placeholder="Ville, code postal ou adresse du relais"
                  />
                </div>
              </>
            )}

            {deliveryMethod === "store" && (
              <>
                <label>
                  Date de retrait
                  <input
                    required
                    type="date"
                    value={pickupDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setPickupDate(event.target.value)}
                  />
                </label>
                <label>
                  Heure optionnelle
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(event) => setPickupTime(event.target.value)}
                  />
                </label>
              </>
            )}
            <p>
              Aucune donnee bancaire n'est saisie ni stockee sur BeautyPlace.
              Stripe ouvrira sa page securisee apres validation.
            </p>
            <button
              type="submit"
              className="cart-submit-button"
              disabled={redirectingToStripe}
            >
              {redirectingToStripe
                ? "Redirection Stripe..."
                : `Continuer vers Stripe - ${formatPrice(totalPrice)}`}
            </button>
          </form>

          <aside className="cart-total">
            <span>Total a payer</span>
            <strong>{formatPrice(totalPrice)}</strong>
            <p>{articles.length} produit(s) dans votre panier.</p>
            <Link href="/panier">Retour au panier</Link>
          </aside>
        </section>
      ) : (
        <section className="empty-cart-panel">
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits avant de payer.</p>
          <Link href="/produits">Voir les produits</Link>
        </section>
      )}
    </main>
  );
}

export default function PaiementCartePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <PaiementCarteContent />
      <Footer />
    </ApolloProvider>
  );
}
