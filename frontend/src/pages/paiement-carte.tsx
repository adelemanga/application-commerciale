import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneHelperText,
} from "../utils/phone";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const relayCarrierOptions = [
  {
    id: "mondial-relay",
    label: "Mondial Relay",
    description: "Recherche officielle disponible",
    available: true,
  },
  {
    id: "colissimo",
    label: "Colissimo / La Poste",
    description: "API a brancher avant production",
    available: false,
  },
  {
    id: "chronopost",
    label: "Chronopost Pickup",
    description: "API a brancher avant production",
    available: false,
  },
];

function PaiementCarteContent() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("home");
  const [relayCarrier, setRelayCarrier] = useState("mondial-relay");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [relayName, setRelayName] = useState("");
  const [relayAddress, setRelayAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [firstnameError, setFirstnameError] = useState("");
  const [lastnameError, setLastnameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [relayNameError, setRelayNameError] = useState("");
  const [relayAddressError, setRelayAddressError] = useState("");
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
  const payableArticles = useMemo(
    () => articles.filter((article: any) => Number(article.product?.price) > 0),
    [articles]
  );
  const payableTotalPrice = useMemo(
    () =>
      payableArticles.reduce(
        (total: number, article: any) => total + (Number(article.product?.price) || 0),
        0
      ),
    [payableArticles]
  );
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;

  const validateCheckoutFields = (fields: {
    firstname: string;
    lastname: string;
    phone: string;
    address: string;
    relayName: string;
    relayAddress: string;
  }) => {
    if (!fields.firstname) return "Le prenom est obligatoire.";
    if (!fields.lastname) return "Le nom est obligatoire.";
    if (!fields.phone) return "Le telephone est obligatoire.";
    if (!isValidPhoneNumber(fields.phone)) return phoneHelperText;

    if (deliveryMethod === "home" && !fields.address) {
      return "Adresse de livraison obligatoire avant de continuer vers le paiement.";
    }

    if (deliveryMethod === "store" && !pickupDate) {
      return "Choisissez une date de retrait en magasin.";
    }

    if (deliveryMethod === "relay") {
      if (!fields.relayName) return "Le nom du point relais est obligatoire.";
      if (!fields.relayAddress) {
        return "L'adresse du point relais est obligatoire.";
      }
    }

    return "";
  };

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
    setAddressError("");
    setFirstnameError("");
    setLastnameError("");
    setPhoneError("");
    setRelayNameError("");
    setRelayAddressError("");

    const cleanFirstname = firstname.trim();
    const cleanLastname = lastname.trim();
    const cleanPhone = normalizePhoneNumber(customerPhone);
    const cleanAddress = customerAddress.trim();
    const cleanRelayName = relayName.trim();
    const cleanRelayAddress = relayAddress.trim();

    if (!reservation?.id || !payableArticles.length || payableTotalPrice <= 0) {
      setMessage("Votre panier est vide.");
      return;
    }

    const validationMessage = validateCheckoutFields({
      firstname: cleanFirstname,
      lastname: cleanLastname,
      phone: cleanPhone,
      address: cleanAddress,
      relayName: cleanRelayName,
      relayAddress: cleanRelayAddress,
    });

    if (validationMessage) {
      if (validationMessage === "Le prenom est obligatoire.") {
        setFirstnameError(validationMessage);
      }
      if (validationMessage === "Le nom est obligatoire.") {
        setLastnameError(validationMessage);
      }
      if (
        validationMessage === "Le telephone est obligatoire." ||
        validationMessage === phoneHelperText
      ) {
        setPhoneError(validationMessage);
      }
      if (deliveryMethod === "home" && !cleanAddress) {
        setAddressError(validationMessage);
      }
      if (validationMessage === "Le nom du point relais est obligatoire.") {
        setRelayNameError(validationMessage);
      }
      if (validationMessage === "L'adresse du point relais est obligatoire.") {
        setRelayAddressError(validationMessage);
      }
      setMessage(validationMessage);
      return;
    }

    try {
      const response = await createStripeCheckoutSession({
        variables: {
          reservationId: reservation.id,
          customerPhone: cleanPhone,
          customerAddress:
            deliveryMethod === "relay" ? cleanRelayAddress : cleanAddress,
          deliveryMethod,
          pickupDate: deliveryMethod === "store" ? pickupDate : null,
          pickupTime: deliveryMethod === "store" ? pickupTime : null,
          relayName: deliveryMethod === "relay" ? cleanRelayName : null,
          relayAddress: deliveryMethod === "relay" ? cleanRelayAddress : null,
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
          <div className="auth-link-row">
            <Link href="/connexion-client">Connexion</Link>
            <Link href="/inscription-client">Inscription</Link>
          </div>
        </section>
      ) : articles.length ? (
        <section className="checkout-layout">
          <form className="checkout-form-card" onSubmit={openStripeCheckout} noValidate>
            <label>
              Prenom
              <input
                required
                name="firstname"
                placeholder="Votre prenom"
                value={firstname}
                onChange={(event) => {
                  setFirstname(event.target.value);
                  setFirstnameError("");
                }}
              />
              {firstnameError && (
                <span className="field-error">{firstnameError}</span>
              )}
            </label>
            <label>
              Nom
              <input
                required
                name="lastname"
                placeholder="Votre nom"
                value={lastname}
                onChange={(event) => {
                  setLastname(event.target.value);
                  setLastnameError("");
                }}
              />
              {lastnameError && <span className="field-error">{lastnameError}</span>}
            </label>
            <label>
              Telephone
              <input
                required
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="Ex : 06 12 34 56 78"
                pattern="0[1-9][0-9]{8}"
                title={phoneHelperText}
                value={customerPhone}
                onChange={(event) => {
                  setCustomerPhone(event.target.value);
                  setPhoneError("");
                }}
              />
              {phoneError && <span className="field-error">{phoneError}</span>}
            </label>
            <div className="checkout-wide-field delivery-choice-group">
              <span>Mode de reception</span>
              <div className="delivery-choice-buttons">
                <button
                  type="button"
                  className={deliveryMethod === "home" ? "active" : ""}
                  onClick={() => {
                    setDeliveryMethod("home");
                    setMessage("");
                    setAddressError("");
                  }}
                >
                  A domicile
                </button>
                <button
                  type="button"
                  className={deliveryMethod === "relay" ? "active" : ""}
                  onClick={() => {
                    setDeliveryMethod("relay");
                    setRelayCarrier("mondial-relay");
                    setMessage("");
                    setAddressError("");
                  }}
                >
                  Point relais
                </button>
                <button
                  type="button"
                  className={deliveryMethod === "store" ? "active" : ""}
                  onClick={() => {
                    setDeliveryMethod("store");
                    setMessage("");
                    setAddressError("");
                  }}
                >
                  Retrait magasin
                </button>
              </div>
            </div>

            {deliveryMethod === "home" && (
              <div className={`checkout-wide-field${addressError ? " field-invalid" : ""}`}>
                <AddressAutocomplete
                  required
                  label="Adresse de livraison"
                  name="address"
                  value={customerAddress}
                  onChange={(value) => {
                    setCustomerAddress(value);
                    setAddressError("");
                  }}
                  placeholder="Region, ville, code postal, rue ou adresse complete"
                />
                {addressError && <p className="error-message">{addressError}</p>}
              </div>
            )}

            {deliveryMethod === "relay" && (
              <>
                <div className="checkout-wide-field">
                  <span className="checkout-field-title">
                    Transporteur point relais
                  </span>
                  <div className="relay-carrier-options">
                    {relayCarrierOptions.map((carrier) => (
                      <button
                        type="button"
                        key={carrier.id}
                        className={relayCarrier === carrier.id ? "active" : ""}
                        disabled={!carrier.available}
                        onClick={() => {
                          setRelayCarrier(carrier.id);
                          setRelayName("");
                          setRelayAddress("");
                          setRelayNameError("");
                          setRelayAddressError("");
                        }}
                      >
                        <strong>{carrier.label}</strong>
                        <small>{carrier.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="checkout-wide-field">
                  {relayCarrier === "mondial-relay" ? (
                    <MondialRelayPicker
                      onSelect={(name, address) => {
                        setRelayName(`Mondial Relay - ${name}`);
                        setRelayAddress(address);
                      }}
                    />
                  ) : (
                    <p className="payment-warning">
                      Ce transporteur sera disponible quand ses identifiants API
                      seront configures.
                    </p>
                  )}
                </div>
                <label>
                  Nom du point relais
                  <input
                    required
                    name="relayName"
                    placeholder="Ex: Relais Beauty Centre"
                    value={relayName}
                    onChange={(event) => {
                      setRelayName(event.target.value);
                      setRelayNameError("");
                    }}
                  />
                  {relayNameError && (
                    <span className="field-error">{relayNameError}</span>
                  )}
                </label>
                <div className="relay-address-field">
                  <AddressAutocomplete
                    required
                    label="Adresse du point relais"
                    name="relayAddress"
                    value={relayAddress}
                    onChange={(value) => {
                      setRelayAddress(value);
                      setRelayAddressError("");
                    }}
                    placeholder="Ville, code postal ou adresse du relais"
                  />
                  {relayAddressError && (
                    <span className="field-error">{relayAddressError}</span>
                  )}
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
                : `Continuer vers Stripe - ${formatPrice(payableTotalPrice || totalPrice)}`}
            </button>
          </form>

          <aside className="cart-total">
            <span>Total a payer</span>
            <strong>{formatPrice(payableTotalPrice || totalPrice)}</strong>
            <p>{payableArticles.length} produit(s) dans votre panier.</p>
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
