import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { CONFIRM_RESERVATION_RECEIVED } from "../graphql/mutations";
import { GET_RESERVATIONS_BY_USER_ID, WHO_AM_I } from "../graphql/queries";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const groupArticlesByProduct = (articles: any[] = []) =>
  articles.reduce((groups: any[], article: any) => {
    const product = article.product ?? {};
    const productKey = product.id ?? product.name ?? article.id;
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

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "Date non disponible";

const statusLabels: Record<string, string> = {
  pending: "Panier en cours",
  submitted: "Commande recue",
  validated: "Validee par BeautyPlace",
  ongoing: "Colis en preparation",
  shipped: "Colis envoye",
  ended: "Colis livre / commande terminee",
};

const paymentLabels: Record<string, string> = {
  paid: "Payee",
  pending: "A payer",
};

const deliveryLabels: Record<string, string> = {
  home: "Livraison a domicile",
  relay: "Point relais",
  store: "Retrait magasin",
};

const trackingSteps = [
  {
    status: "submitted",
    label: "Commande recue",
    detail: "Votre commande est enregistree et transmise a BeautyPlace.",
  },
  {
    status: "validated",
    label: "Validee admin",
    detail: "BeautyPlace a confirme la commande et le traitement commence.",
  },
  {
    status: "ongoing",
    label: "Preparation colis",
    detail: "Les produits sont en preparation avant remise ou expedition.",
  },
  {
    status: "shipped",
    label: "Colis envoye",
    detail: "Le colis est remis au transporteur avec son numero de suivi.",
  },
  {
    status: "ended",
    label: "Colis livre",
    detail: "La commande est terminee et le colis est considere comme livre.",
  },
];

const pickupSteps = [
  {
    status: "submitted",
    label: "Reservation recue",
    detail: "Votre reservation est enregistree et transmise a BeautyPlace.",
  },
  {
    status: "validated",
    label: "Validee BeautyPlace",
    detail: "BeautyPlace a confirme la reservation.",
  },
  {
    status: "ongoing",
    label: "Preparation retrait",
    detail: "Vos produits sont prepares pour un retrait et paiement sur place.",
  },
  {
    status: "ended",
    label: "Retiree sur place",
    detail: "La commande est terminee apres retrait en boutique.",
  },
];

const statusOrder = ["submitted", "validated", "ongoing", "shipped", "ended"];
const pickupStatusOrder = ["submitted", "validated", "ongoing", "ended"];

const getStepState = (
  currentStatus: string,
  stepStatus: string,
  order = statusOrder
) => {
  const currentIndex = order.indexOf(currentStatus);
  const stepIndex = order.indexOf(stepStatus);

  if (currentIndex === -1 || stepIndex === -1) return "";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "";
};

const trackingHelp: Record<string, string> = {
  submitted:
    "Votre commande a bien ete envoyee. Elle attend la validation de BeautyPlace.",
  validated:
    "Votre commande est validee. BeautyPlace peut maintenant preparer le colis.",
  ongoing:
    "Votre colis est en preparation. Cette etape peut aussi correspondre a une expedition ou remise en cours selon l'organisation.",
  shipped:
    "Votre colis a ete envoye. Utilisez le numero de suivi pour suivre son avancement chez le transporteur.",
  ended:
    "Votre commande est terminee. Le colis est marque comme livre ou remis au client.",
};

const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
  if (!carrier || !trackingNumber) return "";

  const normalizedCarrier = carrier.toLowerCase();
  const encodedNumber = encodeURIComponent(trackingNumber);

  if (normalizedCarrier.includes("poste") || normalizedCarrier.includes("colissimo")) {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodedNumber}`;
  }

  if (normalizedCarrier.includes("chronopost")) {
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodedNumber}`;
  }

  if (normalizedCarrier.includes("dhl")) {
    return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${encodedNumber}`;
  }

  if (normalizedCarrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodedNumber}`;
  }

  return "";
};

const sanitizePdfText = (value?: string | number | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfLine = (value: string, maxLength = 78) => {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
      return;
    }
    current = next;
  });

  if (current) lines.push(current);
  return lines;
};

const buildPdfDocument = (lines: string[]) => {
  const pageHeight = 842;
  const lineHeight = 18;
  let y = 800;
  const content = [
    "BT",
    "/F1 20 Tf",
    "1 0 0 1 50 800 Tm",
    `(Facture Beauty Place) Tj`,
    "/F1 11 Tf",
  ];

  lines.forEach((line) => {
    wrapPdfLine(line).forEach((wrappedLine) => {
      y -= lineHeight;
      if (y < 52) return;
      content.push(`1 0 0 1 50 ${y} Tm`);
      content.push(`(${sanitizePdfText(wrappedLine)}) Tj`);
    });
  });

  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

const buildPdfDataUrl = (lines: string[]) => {
  if (typeof window === "undefined" || !lines.length) return "";
  return `data:application/pdf;base64,${window.btoa(buildPdfDocument(lines))}`;
};

function TrackingContent() {
  const router = useRouter();
  const selectedOrderId =
    typeof router.query.commande === "string" ? router.query.commande : "";
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_RESERVATIONS_BY_USER_ID, {
    fetchPolicy: "network-only",
  });
  const [confirmReservationReceived, { loading: confirmingReceived }] =
    useMutation(CONFIRM_RESERVATION_RECEIVED, {
      refetchQueries: [{ query: GET_RESERVATIONS_BY_USER_ID }],
    });

  const isLoggedIn = Boolean(userData?.whoAmI?.isLoggedIn);
  const orders = data?.getReservationsByUserId ?? [];
  const paidOrSentOrders = orders.filter((item: any) =>
    ["submitted", "validated", "ongoing", "shipped", "ended"].includes(
      item.reservation.status
    )
  );
  const selectedOrder =
    paidOrSentOrders.find(
      (item: any) => String(item.reservation.id) === selectedOrderId
    ) ?? paidOrSentOrders[0];
  const reservation = selectedOrder?.reservation;
  const productLines = reservation
    ? groupArticlesByProduct(reservation.articles)
    : [];
  const trackingUrl = reservation
    ? getTrackingUrl(reservation.shippingCarrier, reservation.trackingNumber)
    : "";
  const isOnlinePaid =
    reservation?.paymentMethod === "card" &&
    reservation?.paymentStatus === "paid" &&
    Boolean(reservation?.stripeSessionId);
  const deliveryMethod = reservation?.deliveryMethod || "home";
  const isStorePickup = deliveryMethod === "store";
  const deliveryLabel = deliveryLabels[deliveryMethod] || "Livraison a domicile";
  const deliveryDetail =
    deliveryMethod === "store"
      ? reservation?.pickupDate
        ? `${formatDate(reservation.pickupDate)}${
            reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""
          }`
        : "Date de retrait a confirmer"
      : deliveryMethod === "relay"
      ? `${reservation?.relayName || "Point relais a confirmer"} - ${
          reservation?.relayAddress || reservation?.customerAddress || "adresse a confirmer"
        }`
      : reservation?.customerAddress || userData?.whoAmI?.address || "Adresse a confirmer";
  const activeSteps = isOnlinePaid ? trackingSteps : pickupSteps;
  const activeStatusOrder = isOnlinePaid ? statusOrder : pickupStatusOrder;
  const currentStatusLabel = isOnlinePaid
    ? statusLabels[reservation?.status] ?? reservation?.status
    : reservation?.status === "ongoing"
    ? "Preparation retrait sur place"
    : reservation?.status === "ended"
    ? "Commande retiree sur place"
    : statusLabels[reservation?.status] ?? reservation?.status;
  const clientName = [
    userData?.whoAmI?.firstname,
    userData?.whoAmI?.lastname,
  ]
    .filter(Boolean)
    .join(" ");

  const invoiceLines =
    reservation && selectedOrder
      ? [
      `Recu #${reservation.id}`,
      `Commande du ${formatDate(reservation.createdAt)}`,
      "",
      `Client : ${clientName || userData?.whoAmI?.email || ""}`,
      `Email : ${userData?.whoAmI?.email || ""}`,
      `Telephone : ${reservation.customerPhone || userData?.whoAmI?.phone || "Non renseigne"}`,
      `Adresse : ${reservation.customerAddress || userData?.whoAmI?.address || "Non renseignee"}`,
      "",
      `Statut : ${statusLabels[reservation.status] ?? reservation.status}`,
      `Paiement : ${
        paymentLabels[reservation.paymentStatus] ?? reservation.paymentStatus
      }`,
      `Mode : ${deliveryLabel}`,
      `Detail : ${deliveryDetail}`,
      isOnlinePaid && !isStorePickup
        ? `Transporteur : ${reservation.shippingCarrier || "A definir"}`
        : "Transporteur : non concerne",
      isOnlinePaid && !isStorePickup
        ? `Numero de suivi : ${reservation.trackingNumber || "A venir"}`
        : "Expedition : retrait en magasin",
      "",
      "Produits commandes :",
      ...productLines.map(
        (line) =>
          `- ${line.product.name} x${line.quantity} : ${formatPrice(line.total)}`
      ),
      "",
      `Total facture : ${formatPrice(selectedOrder.totalPrice)}`,
      "",
      "Beauty Place vous remercie pour votre commande.",
        ]
      : [];
  const pdfFilename = reservation
    ? `facture-beauty-place-${reservation.id}.pdf`
    : "facture-beauty-place.pdf";
  const pdfDataUrl = buildPdfDataUrl(invoiceLines);
  const canConfirmReceived =
    isOnlinePaid && reservation?.status === "shipped";

  const markAsReceived = async () => {
    if (!reservation) return;

    await confirmReservationReceived({
      variables: {
        reservationId: reservation.id,
      },
    });
  };

  return (
    <main className="shop-page tracking-page">
      <section className="shop-hero">
        <p className="shop-kicker">Suivi et facture</p>
        <h1>Suivi de commande</h1>
        <p>
          Retrouvez le traitement de votre commande, le paiement, les produits et
          votre recu de facturation.
        </p>
      </section>

      {(loading || loadingUser) && (
        <p className="shop-message">Chargement de vos commandes...</p>
      )}
      {error && (
        <p className="shop-message">Impossible de charger le suivi de commande.</p>
      )}

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connectez-vous pour voir vos commandes</h2>
          <p>Le suivi est rattache a votre compte client.</p>
          <Link href="/connexion-client">Connexion ou inscription</Link>
        </section>
      ) : selectedOrder ? (
        <section className="tracking-layout">
          <aside className="tracking-list">
            <h2>Mes commandes</h2>
            {paidOrSentOrders.map((item: any) => (
              <Link
                className={
                  item.reservation.id === reservation.id
                    ? "tracking-order active"
                    : "tracking-order"
                }
                href={`/suivi-commandes?commande=${item.reservation.id}`}
                key={item.reservation.id}
              >
                <span>Commande #{item.reservation.id}</span>
                <small>{formatDate(item.reservation.createdAt)}</small>
                <strong>{formatPrice(item.totalPrice)}</strong>
              </Link>
            ))}
          </aside>

          <article className="receipt-card">
            <div className="receipt-header">
              <div>
                <p className="shop-kicker">Facture Beauty Place</p>
                <h2>Recu #{reservation.id}</h2>
                <p>Commande du {formatDate(reservation.createdAt)}</p>
              </div>
              <div className="receipt-actions">
                {pdfDataUrl && (
                  <a href={pdfDataUrl} download={pdfFilename}>
                    Telecharger PDF
                  </a>
                )}
                <button type="button" onClick={() => window.print()}>
                  Imprimer
                </button>
              </div>
            </div>

            <div className="tracking-steps" aria-label="Etapes du colis">
              {activeSteps.map((step) => (
                <div
                  className={`tracking-step ${getStepState(
                    reservation.status,
                    step.status,
                    activeStatusOrder
                  )}`}
                  key={step.status}
                >
                  <span>{step.label}</span>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="parcel-status-card">
              <span>{isStorePickup ? "Retrait magasin" : "Suivi colis actuel"}</span>
              <strong>{currentStatusLabel}</strong>
              <p>
                {isStorePickup
                  ? "Votre commande est payee et sera disponible en magasin selon le rendez-vous choisi."
                  : isOnlinePaid
                  ? trackingHelp[reservation.status] ||
                    "Le statut sera mis a jour lorsque BeautyPlace modifiera la commande."
                  : "Cette commande est reservee pour un paiement sur place. Aucun colis ne sera envoye."}
              </p>
              {canConfirmReceived && (
                <button
                  type="button"
                  className="received-button"
                  disabled={confirmingReceived}
                  onClick={markAsReceived}
                >
                  {confirmingReceived ? "Confirmation..." : "Recu"}
                </button>
              )}
            </div>

            {isOnlinePaid && !isStorePickup ? (
              <div className="tracking-number-card">
                <span>Transporteur et numero</span>
                <strong>{reservation.shippingCarrier || "Transporteur a venir"}</strong>
                <p>
                  {reservation.trackingNumber
                    ? `Numero de suivi : ${reservation.trackingNumber}`
                    : "Le numero de suivi apparaitra ici quand BeautyPlace aura expedie le colis."}
                </p>
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noreferrer">
                    Suivre sur le site du transporteur
                  </a>
                )}
              </div>
            ) : (
              <div className="tracking-number-card">
                <span>{deliveryLabel}</span>
                <strong>{isStorePickup ? "Commande payee" : deliveryLabel}</strong>
                <p>
                  {deliveryDetail}
                </p>
              </div>
            )}

            <div className="receipt-grid">
              <div>
                <span>Client</span>
                <strong>{clientName || userData?.whoAmI?.email}</strong>
                <p>{userData?.whoAmI?.email}</p>
              </div>
              <div>
                <span>{deliveryLabel}</span>
                <strong>{reservation.customerPhone || userData?.whoAmI?.phone}</strong>
                <p>{deliveryDetail}</p>
              </div>
              <div>
                <span>Statut</span>
                <strong>{currentStatusLabel}</strong>
                <p>
                  Paiement :{" "}
                  {paymentLabels[reservation.paymentStatus] ??
                    reservation.paymentStatus}
                </p>
              </div>
              <div>
                <span>{isStorePickup ? "Retrait" : "Expedition"}</span>
                <strong>
                  {isOnlinePaid && !isStorePickup
                    ? reservation.shippingCarrier || "A definir"
                    : deliveryLabel}
                </strong>
                <p>
                  {isOnlinePaid && !isStorePickup
                    ? reservation.trackingNumber || "Numero de suivi a venir"
                    : deliveryDetail}
                </p>
              </div>
            </div>

            <div className="receipt-lines">
              {productLines.map((line) => (
                <div className="receipt-line" key={line.productKey}>
                  <img src={line.product.imgUrl} alt={line.product.name} />
                  <span>{line.product.name}</span>
                  <span className="order-product-quantity">x{line.quantity}</span>
                  <strong>{formatPrice(line.total)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-total">
              <span>Total facture</span>
              <strong>{formatPrice(selectedOrder.totalPrice)}</strong>
            </div>

            <p className="receipt-note">
              Un email de confirmation/facturation est envoye au client lorsque
              la commande est validee apres paiement ou envoyee a
              BeautyPlace.
            </p>

          </article>
        </section>
      ) : (
        <section className="empty-cart-panel">
          <h2>Aucune commande envoyee</h2>
          <p>Validez votre panier pour obtenir un recu et suivre le traitement.</p>
          <Link href="/produits">Voir les produits</Link>
        </section>
      )}
    </main>
  );
}

export default function SuiviCommandesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <TrackingContent />
      <Footer />
    </ApolloProvider>
  );
}
