import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  CONFIRM_RESERVATION_RECEIVED,
  HIDE_RESERVATION_FROM_CLIENT,
} from "../graphql/mutations";
import {
  GET_MY_CLIENT_MESSAGES,
  GET_RESERVATIONS_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";
import { defaultProductImage, getProductImage } from "../utils/productImages";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const groupArticlesByProduct = (articles: any[] = []) =>
  articles.reduce((groups: any[], article: any) => {
    const product = {
      ...(article.product ?? {}),
      imgUrl: getProductImage(article.product),
    };
    const productKey = product.id ?? product.name ?? article.id;
    const existingGroup = groups.find(
      (group) => group.productKey === productKey
    );

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

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "Date non disponible";

const statusLabels: Record<string, string> = {
  pending: "Panier en cours",
  submitted: "Commande reçue",
  validated: "Validée par BeautyPlace",
  ongoing: "Colis en préparation",
  shipped: "Colis envoyé",
  ended: "Colis livre / commande terminée",
};

const paymentLabels: Record<string, string> = {
  paid: "Payée",
  pending: "A payer",
};

const deliveryLabels: Record<string, string> = {
  home: "Livraison à domicile",
  relay: "Point relais",
  store: "Retrait magasin",
};

const getOrderDisplayType = (reservation: any) => {
  if (reservation?.status === "pending") return "Panier non valide";
  if (
    reservation?.paymentStatus === "paid" &&
    reservation?.deliveryMethod === "home"
  ) {
    return "Commande à livrer";
  }
  if (
    reservation?.paymentStatus === "paid" &&
    reservation?.deliveryMethod === "relay"
  ) {
    return "Commande en point relais";
  }
  if (
    reservation?.paymentStatus === "paid" &&
    reservation?.deliveryMethod === "store"
  ) {
    return "Commande à retirer";
  }
  return "Commande en cours";
};

const requiresTrackingForInvoice = (reservation: any) =>
  reservation?.paymentMethod === "card" &&
  reservation?.paymentStatus === "paid" &&
  reservation?.deliveryMethod !== "store";

const canShowClientInvoice = (reservation: any) =>
  !requiresTrackingForInvoice(reservation) ||
  Boolean(
    reservation?.shippingCarrier?.trim() && reservation?.trackingNumber?.trim()
  );

const trackingSteps = [
  {
    status: "submitted",
    label: "Commande reçue",
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
    label: "Colis envoyé",
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
    label: "Reservation reçue",
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
    "Votre commande a bien ete envoyée. Elle attend la validation de BeautyPlace.",
  validated:
    "Votre commande est validee. BeautyPlace peut maintenant preparer le colis.",
  ongoing:
    "Votre colis est en preparation. Cette etape peut aussi correspondre a une expedition ou remise en cours selon l'organisation.",
  shipped:
    "Votre colis a été envoyé. Utilisez le numero de suivi pour suivre son avancement chez le transporteur.",
  ended:
    "Votre commande est terminée. Le colis est marqué comme livre ou remis au client.",
};

const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
  if (!carrier || !trackingNumber) return "";

  const normalizedCarrier = carrier.toLowerCase();
  const encodedNumber = encodeURIComponent(trackingNumber);

  if (
    normalizedCarrier.includes("poste") ||
    normalizedCarrier.includes("colissimo")
  ) {
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
    .replace(/€/g, "EUR")
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

type InvoicePdfProduct = {
  name: string;
  quantity: number;
  total: string;
};

type InvoicePdfData = {
  id: string | number;
  date: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  payment: string;
  deliveryMode: string;
  deliveryDetail: string;
  carrier: string;
  trackingNumber: string;
  products: InvoicePdfProduct[];
  total: string;
};

const buildPdfDocument = (invoice: InvoicePdfData) => {
  const pageHeight = 842;
  const content: string[] = [];
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) => {
    content.push(`q ${color} rg ${x} ${y} ${width} ${height} re f Q`);
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size = 10,
    color = "0.20 0.16 0.14",
    font = "F1"
  ) => {
    content.push(
      `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${sanitizePdfText(
        value
      )}) Tj ET`
    );
  };
  const multiline = (
    value: string,
    x: number,
    y: number,
    maxLength = 48,
    size = 9,
    color = "0.25 0.22 0.20"
  ) => {
    wrapPdfLine(value, maxLength)
      .slice(0, 3)
      .forEach((line, index) => text(line, x, y - index * 12, size, color));
  };

  rect(0, 0, 595, pageHeight, "0.99 0.97 0.95");
  rect(0, 734, 595, 108, "0.36 0.18 0.31");
  rect(0, 728, 595, 6, "0.89 0.67 0.75");

  text("Beauty Place", 42, 795, 25, "1 1 1", "F2");
  text("Facture client", 42, 772, 11, "0.98 0.88 0.82");
  text(`Recu #${invoice.id}`, 435, 795, 15, "1 1 1", "F2");
  text(`Commande du ${invoice.date}`, 435, 774, 9, "0.98 0.88 0.82");

  rect(42, 612, 511, 92, "1 1 1");
  rect(42, 701, 511, 3, "0.89 0.67 0.75");
  text("Client", 62, 678, 11, "0.36 0.18 0.31", "F2");
  text(
    invoice.clientName || invoice.email,
    62,
    660,
    10,
    "0.13 0.11 0.10",
    "F2"
  );
  text(invoice.email, 62, 644, 9);
  text(invoice.phone, 62, 629, 9);
  multiline(invoice.address, 62, 615, 44, 8);

  text("Commande", 330, 678, 11, "0.36 0.18 0.31", "F2");
  text(`Statut : ${invoice.status}`, 330, 660, 9);
  text(`Paiement : ${invoice.payment}`, 330, 645, 9);
  text(`Mode : ${invoice.deliveryMode}`, 330, 630, 9);
  multiline(invoice.deliveryDetail, 330, 615, 42, 8);

  text("Produits commandés", 42, 570, 14, "0.36 0.18 0.31", "F2");
  rect(42, 540, 511, 24, "0.36 0.18 0.31");
  text("Produit", 58, 548, 9, "1 1 1", "F2");
  text("Quantite", 382, 548, 9, "1 1 1", "F2");
  text("Total", 480, 548, 9, "1 1 1", "F2");

  let rowY = 513;
  invoice.products.forEach((product, index) => {
    if (rowY < 210) return;
    rect(42, rowY - 8, 511, 30, index % 2 === 0 ? "1 1 1" : "0.98 0.94 0.92");
    multiline(product.name, 58, rowY + 5, 54, 9, "0.14 0.12 0.11");
    text(`x${product.quantity}`, 392, rowY + 2, 10, "0.14 0.12 0.11", "F2");
    text(product.total, 480, rowY + 2, 10, "0.14 0.12 0.11", "F2");
    rowY -= 34;
  });

  rect(348, rowY - 34, 205, 45, "0.36 0.18 0.31");
  text("Total facture", 368, rowY - 7, 10, "0.98 0.88 0.82");
  text(invoice.total, 468, rowY - 10, 16, "1 1 1", "F2");

  const shippingY = rowY - 90;
  rect(42, shippingY, 511, 52, "1 1 1");
  text("Livraison et suivi", 62, shippingY + 32, 11, "0.36 0.18 0.31", "F2");
  text(`Transporteur : ${invoice.carrier}`, 62, shippingY + 15, 9);
  text(`Numero de suivi : ${invoice.trackingNumber}`, 330, shippingY + 15, 9);

  rect(42, 52, 511, 58, "0.98 0.94 0.92");
  text("Merci pour votre commande.", 62, 86, 13, "0.36 0.18 0.31", "F2");
  text(
    "Beauty Place reste disponible pour toute question depuis votre espace client.",
    62,
    68,
    9
  );

  const stream = content.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
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
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

const buildInvoicePdfDataUrl = (invoice?: InvoicePdfData) => {
  if (typeof window === "undefined" || !invoice) return "";
  return `data:application/pdf;base64,${window.btoa(
    buildPdfDocument(invoice)
  )}`;
};

function TrackingContent() {
  const router = useRouter();
  const selectedOrderId =
    typeof router.query.commande === "string" ? router.query.commande : "";
  const [activeOrderId, setActiveOrderId] = useState(selectedOrderId);
  const [clientNotice, setClientNotice] = useState("");
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const isLoggedIn = Boolean(userData?.whoAmI?.isLoggedIn);
  const { data, loading, error } = useQuery(GET_RESERVATIONS_BY_USER_ID, {
    fetchPolicy: "network-only",
  });
  const { data: clientMessagesData } = useQuery(GET_MY_CLIENT_MESSAGES, {
    fetchPolicy: "cache-and-network",
    pollInterval: 15000,
    skip: !isLoggedIn,
  });
  const [confirmReservationReceived, { loading: confirmingReceived }] =
    useMutation(CONFIRM_RESERVATION_RECEIVED, {
      refetchQueries: [{ query: GET_RESERVATIONS_BY_USER_ID }],
    });
  const [hideReservationFromClient, { loading: deletingInvoice }] = useMutation(
    HIDE_RESERVATION_FROM_CLIENT,
    {
      refetchQueries: [{ query: GET_RESERVATIONS_BY_USER_ID }],
    }
  );

  const unreadBeautyPlaceMessages =
    clientMessagesData?.getMyClientMessages?.filter(
      (clientMessage: any) =>
        clientMessage.senderRole === "Admin" && !clientMessage.readAt
    ) ?? [];
  const orders = data?.getReservationsByUserId ?? [];
  const trackedOrders = orders.filter((item: any) => {
    const reservation = item.reservation;

    return reservation?.paymentStatus === "paid";
  });

  useEffect(() => {
    if (selectedOrderId) {
      setActiveOrderId(selectedOrderId);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    if (!trackedOrders.length) {
      setActiveOrderId("");
      return;
    }

    const activeOrderExists = trackedOrders.some(
      (item: any) => String(item.reservation.id) === activeOrderId
    );

    if (!activeOrderId || !activeOrderExists) {
      setActiveOrderId(String(trackedOrders[0].reservation.id));
    }
  }, [activeOrderId, trackedOrders]);

  const selectedOrder =
    trackedOrders.find(
      (item: any) => String(item.reservation.id) === activeOrderId
    ) ?? trackedOrders[0];
  const reservation = selectedOrder?.reservation;
  const orderedArticles = reservation ? getOrderedArticles(reservation) : [];
  const productLines = reservation
    ? groupArticlesByProduct(orderedArticles)
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
  const requiresShippingDetails = isOnlinePaid && !isStorePickup;
  const hasCompleteShippingDetails = reservation
    ? canShowClientInvoice(reservation)
    : false;
  const canDisplayInvoice =
    Boolean(reservation && selectedOrder) && hasCompleteShippingDetails;
  const deliveryLabel =
    deliveryLabels[deliveryMethod] || "Livraison a domicile";
  const deliveryDetail =
    deliveryMethod === "store"
      ? reservation?.pickupDate
        ? `${formatDate(reservation.pickupDate)}${
            reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""
          }`
        : "Date de retrait a confirmer"
      : deliveryMethod === "relay"
      ? `${reservation?.relayName || "Point relais a confirmer"} - ${
          reservation?.relayAddress ||
          reservation?.customerAddress ||
          "adresse a confirmer"
        }`
      : reservation?.customerAddress ||
        userData?.whoAmI?.address ||
        "Adresse a confirmer";
  const activeSteps = isOnlinePaid ? trackingSteps : pickupSteps;
  const activeStatusOrder = isOnlinePaid ? statusOrder : pickupStatusOrder;
  const currentStatusLabel = isOnlinePaid
    ? statusLabels[reservation?.status] ?? reservation?.status
    : reservation?.status === "ongoing"
    ? "Preparation retrait sur place"
    : reservation?.status === "ended"
    ? "Commande retiree sur place"
    : statusLabels[reservation?.status] ?? reservation?.status;
  const clientName = [userData?.whoAmI?.firstname, userData?.whoAmI?.lastname]
    .filter(Boolean)
    .join(" ");

  const invoiceData: InvoicePdfData | undefined =
    reservation && selectedOrder && canDisplayInvoice
      ? {
          id: reservation.id,
          date: formatDate(reservation.createdAt),
          clientName: clientName || userData?.whoAmI?.email || "",
          email: userData?.whoAmI?.email || "",
          phone:
            reservation.customerPhone ||
            userData?.whoAmI?.phone ||
            "Non renseigne",
          address:
            reservation.customerAddress ||
            userData?.whoAmI?.address ||
            "Non renseignee",
          status: statusLabels[reservation.status] ?? reservation.status,
          payment:
            paymentLabels[reservation.paymentStatus] ??
            reservation.paymentStatus,
          deliveryMode: deliveryLabel,
          deliveryDetail,
          carrier: requiresShippingDetails
            ? reservation.shippingCarrier || "Transporteur en attente"
            : "Non concerne",
          trackingNumber: requiresShippingDetails
            ? reservation.trackingNumber || "A venir"
            : "Retrait en magasin",
          products: productLines.map((line) => ({
            name: line.product.name,
            quantity: line.quantity,
            total: formatPrice(line.total),
          })),
          total: formatPrice(selectedOrder.totalPrice),
        }
      : undefined;
  const pdfFilename = reservation
    ? `facture-beauty-place-${reservation.id}.pdf`
    : "facture-beauty-place.pdf";
  const pdfDataUrl = buildInvoicePdfDataUrl(invoiceData);
  const canConfirmReceived = isOnlinePaid && reservation?.status === "shipped";

  const markAsReceived = async () => {
    if (!reservation) return;

    await confirmReservationReceived({
      variables: {
        reservationId: reservation.id,
      },
    });
  };

  const deleteInvoiceFromClientSpace = async (targetReservationId?: string) => {
    const reservationId = targetReservationId || reservation?.id;
    if (!reservationId) return;

    setClientNotice("");

    try {
      await hideReservationFromClient({
        variables: {
          reservationId,
        },
      });

      const nextOrder = trackedOrders.find(
        (item: any) => item.reservation.id !== reservationId
      );

      if (!reservation || reservationId === reservation.id) {
        setActiveOrderId(nextOrder ? String(nextOrder.reservation.id) : "");
      }

      setClientNotice("Commande supprimee de votre espace client.");
    } catch {
      setClientNotice("Impossible de supprimer cette commande pour le moment.");
    }
  };

  return (
    <main className="shop-page tracking-page">
      <section className="shop-hero">
        <p className="shop-kicker">Suivi et facture</p>
        <h1>Suivi de commande</h1>
        <p>
          Retrouvez le traitement de votre commande, le paiement, les produits
          et votre reçue de facturation.
        </p>
        {isLoggedIn && (
          <p className="tracking-account-note">
            Compte connecte : <strong>{userData?.whoAmI?.email}</strong>
          </p>
        )}
      </section>

      {(loading || loadingUser) && (
        <p className="shop-message">Chargement de vos commandes...</p>
      )}
      {error && (
        <p className="shop-message">
          Impossible de charger le suivi de commande.
        </p>
      )}
      {clientNotice && <p className="shop-message">{clientNotice}</p>}
      {isLoggedIn && unreadBeautyPlaceMessages.length > 0 && (
        <div className="client-message-alert">
          <div>
            <strong>
              {unreadBeautyPlaceMessages.length} nouveau(x) message(s)
              BeautyPlace
            </strong>
            <span>
              Une mise a jour de commande ou de livraison vous attend.
            </span>
          </div>
          <Link href="/messages-client">Ouvrir ma messagerie</Link>
        </div>
      )}

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connectez-vous pour voir vos commandes</h2>
          <p>Le suivi est rattache a votre compte client.</p>
          <div className="auth-link-row">
            <Link href="/connexion-client">Connexion</Link>
            <Link href="/inscription-client">Inscription</Link>
          </div>
        </section>
      ) : selectedOrder ? (
        <section className="tracking-layout">
          <aside className="tracking-list">
            <h2>Mes commandes</h2>
            {trackedOrders.map((item: any) => {
              const itemHasInvoice = canShowClientInvoice(item.reservation);

              return (
                <div className="tracking-order-card" key={item.reservation.id}>
                  <button
                    type="button"
                    className={
                      item.reservation.id === reservation.id
                        ? "tracking-order active"
                        : "tracking-order"
                    }
                    onClick={() =>
                      setActiveOrderId(String(item.reservation.id))
                    }
                  >
                    <span>Commande #{item.reservation.id}</span>
                    <small>{formatDate(item.reservation.createdAt)}</small>
                    <small>{getOrderDisplayType(item.reservation)}</small>
                    <small>
                      {statusLabels[item.reservation.status] ||
                        item.reservation.status}
                    </small>
                    <strong>{formatPrice(item.totalPrice)}</strong>
                  </button>
                  {itemHasInvoice && (
                    <button
                      type="button"
                      className="tracking-delete-button"
                      disabled={deletingInvoice}
                      onClick={() =>
                        deleteInvoiceFromClientSpace(item.reservation.id)
                      }
                    >
                      Supprimer cette facture
                    </button>
                  )}
                </div>
              );
            })}
          </aside>

          <article className="receipt-card">
            <div className="receipt-header">
              <div>
                <p className="shop-kicker">
                  {canDisplayInvoice
                    ? "Facture Beauty Place"
                    : "Suivi Beauty Place"}
                </p>
                <h2>
                  {canDisplayInvoice
                    ? `Reçu #${reservation.id}`
                    : `Commande #${reservation.id}`}
                </h2>
                <p>Commande du {formatDate(reservation.createdAt)}</p>
              </div>
              <div className="receipt-actions">
                {canDisplayInvoice && pdfDataUrl ? (
                  <a href={pdfDataUrl} download={pdfFilename}>
                    Telecharger votre facture
                  </a>
                ) : (
                  <button type="button" disabled>
                    Facture en attente
                  </button>
                )}
                <button
                  type="button"
                  className="danger-button"
                  disabled={deletingInvoice}
                  onClick={() => deleteInvoiceFromClientSpace()}
                >
                  {deletingInvoice
                    ? "Suppression..."
                    : canDisplayInvoice
                    ? "Supprimer la facture"
                    : "Supprimer de mon espace client"}
                </button>
                <button
                  type="button"
                  disabled={!canDisplayInvoice}
                  onClick={() => window.print()}
                >
                  Imprimer
                </button>
              </div>
            </div>

            {!canDisplayInvoice && (
              <p className="receipt-waiting-note">
                Facture disponible après ajout du transporteur et du numéro de
                suivi par BeautyPlace.
              </p>
            )}

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
              <span>
                {isStorePickup ? "Retrait magasin" : "Suivi colis actuel"}
              </span>
              <strong>{currentStatusLabel}</strong>
              <p>
                {isStorePickup
                  ? "Votre commande est payée et sera disponible en magasin selon le rendez-vous choisi."
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
                  {confirmingReceived ? "Confirmation..." : "Reçu"}
                </button>
              )}
            </div>

            {isOnlinePaid && !isStorePickup ? (
              <div className="tracking-number-card">
                <span>Transporteur et numéro</span>
                <strong>
                  {reservation.shippingCarrier || "Transporteur a venir"}
                </strong>
                <p>
                  {reservation.trackingNumber
                    ? `Numero de suivi : ${reservation.trackingNumber}`
                    : "Le numéro de suivi apparaîtra ici quand BeautyPlace aura expedié le colis."}
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
                <strong>
                  {isStorePickup ? "Commande payée" : deliveryLabel}
                </strong>
                <p>{deliveryDetail}</p>
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
                <strong>
                  {reservation.customerPhone || userData?.whoAmI?.phone}
                </strong>
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
                    ? reservation.shippingCarrier || "Transporteur en attente"
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
                  <img
                    src={getProductImage(line.product)}
                    alt={line.product.name}
                    onError={(event) => {
                      event.currentTarget.src = defaultProductImage;
                    }}
                  />
                  <span>{line.product.name}</span>
                  <span className="order-product-quantity">
                    x{line.quantity}
                  </span>
                  <strong>{formatPrice(line.total)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-total">
              <span>
                {canDisplayInvoice ? "Total facture" : "Total commande"}
              </span>
              <strong>{formatPrice(selectedOrder.totalPrice)}</strong>
            </div>

            {canDisplayInvoice ? (
              <p className="receipt-note">
                Un email de confirmation/facturation est envoyé au client
                lorsque la commande est validée apres paiement ou envoyée a
                BeautyPlace.
              </p>
            ) : (
              <p className="receipt-note">
                La facture sera disponible lorsque BeautyPlace aura renseigné le
                transporteur et le numero de suivi.
              </p>
            )}
          </article>
        </section>
      ) : (
        <section className="empty-cart-panel">
          <h2>Aucune commande disponible</h2>
          <p>
            Vos commandes payées apparaitront ici après confirmation du
            paiement.
          </p>
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
