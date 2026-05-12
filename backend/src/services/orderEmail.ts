import nodemailer from "nodemailer";
import { calculateTotal } from "../../utils/reservation/CalculateTotal";
import { Reservation } from "../entities/Reservation";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const getTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

const getTrackingUrl = (
  carrier?: string | null,
  trackingNumber?: string | null
) => {
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

const getDeliveryLabel = (reservation: Reservation) => {
  if (reservation.deliveryMethod === "store") return "Retrait magasin";
  if (reservation.deliveryMethod === "relay") return "Point relais";
  return "Livraison a domicile";
};

const statusLabels: Record<string, string> = {
  pending: "Panier en cours",
  submitted: "Commande reçue",
  validated: "Commande validée",
  ongoing: "Commande en préparation",
  shipped: "Colis envoyé",
  ended: "Commande terminée",
};

const buildDeliveryHtml = (reservation: Reservation) => {
  if (reservation.deliveryMethod === "store") {
    return `
      <p><strong>Mode :</strong> Retrait magasin</p>
      <p><strong>Date de retrait :</strong> ${
        reservation.pickupDate || "A confirmer"
      }${reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""}</p>
    `;
  }

  if (reservation.deliveryMethod === "relay") {
    return `
      <p><strong>Mode :</strong> Point relais</p>
      <p><strong>Relais :</strong> ${reservation.relayName || "A confirmer"}</p>
      <p><strong>Adresse relais :</strong> ${
        reservation.relayAddress || reservation.customerAddress || "A confirmer"
      }</p>
    `;
  }

  return `<p><strong>Mode :</strong> ${getDeliveryLabel(reservation)}</p>`;
};

const groupArticlesByProduct = (articles: Reservation["articles"] = []) =>
  articles.reduce<
    {
      productKey: string;
      productName: string;
      quantity: number;
      total: number;
    }[]
  >((groups, article) => {
    const productKey = String(
      article.product?.id ?? article.product?.name ?? article.id
    );
    const existingGroup = groups.find(
      (group) => group.productKey === productKey
    );

    if (existingGroup) {
      existingGroup.quantity += 1;
      existingGroup.total += article.product?.price ?? 0;
      return groups;
    }

    groups.push({
      productKey,
      productName: article.product?.name ?? "Produit",
      quantity: 1,
      total: article.product?.price ?? 0,
    });

    return groups;
  }, []);

const buildOrderHtml = (
  reservation: Reservation,
  variant: "admin" | "client"
) => {
  const total = calculateTotal(reservation.articles ?? []);
  const productLines = groupArticlesByProduct(reservation.articles ?? []);
  const trackingUrl = getTrackingUrl(
    reservation.shippingCarrier,
    reservation.trackingNumber
  );
  const trackingHtml = reservation.trackingNumber
    ? `
      <p><strong>Transporteur :</strong> ${
        reservation.shippingCarrier || "A definir"
      }</p>
      <p><strong>Numero de suivi :</strong> ${reservation.trackingNumber}</p>
      ${
        trackingUrl
          ? `<p><a href="${trackingUrl}" style="color:#5e2f4f;font-weight:bold;">Suivre le colis</a></p>`
          : ""
      }
    `
    : "";
  const deliveryHtml = buildDeliveryHtml(reservation);
  const title =
    variant === "admin"
      ? "Nouvelle commande Beauty Place"
      : "Votre reçu de commande Beauty Place";
  const intro =
    variant === "admin"
      ? "Une nouvelle commande vient d'être envoyée a l'administration."
      : "Merci pour votre commande. Voici votre recu avec le recapitulatif de facturation.";
  const products = productLines
    .map(
      (line) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ead8cf;">${
            line.productName
          }</td>
          <td style="padding:8px 0;border-bottom:1px solid #ead8cf;text-align:center;">x${
            line.quantity
          }</td>
          <td style="padding:8px 0;border-bottom:1px solid #ead8cf;text-align:right;">${formatPrice(
            line.total
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
      <h1 style="color:#5e2f4f;">${title}</h1>
      <p>${intro}</p>
      <p><strong>Commande :</strong> #${reservation.id}</p>
      <p><strong>Client :</strong> ${reservation.user?.firstname ?? ""} ${
    reservation.user?.lastname ?? ""
  }</p>
      <p><strong>Email :</strong> ${reservation.user?.email ?? ""}</p>
      <p><strong>Telephone :</strong> ${
        reservation.customerPhone || reservation.user?.phone || "Non renseigne"
      }</p>
      <p><strong>Adresse :</strong> ${
        reservation.customerAddress ||
        reservation.user?.address ||
        "Non renseignee"
      }</p>
      <p><strong>Paiement :</strong> ${
        reservation.paymentMethod === "card"
          ? "Carte bancaire"
          : "Paiement sur place"
      } - ${reservation.paymentStatus === "paid" ? "paye" : "a payer"}</p>
      ${deliveryHtml}
      ${trackingHtml}
      <table style="width:100%;border-collapse:collapse;margin:18px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #5e2f4f;">Produit</th>
            <th style="text-align:center;padding:8px 0;border-bottom:2px solid #5e2f4f;">Quantite</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #5e2f4f;">Total</th>
          </tr>
        </thead>
        <tbody>${products}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total :</strong> ${formatPrice(
        total
      )}</p>
      <p style="margin-top:20px;color:#76636c;">
        Conservez cet email comme justificatif. Le suivi est disponible dans
        votre espace client, rubrique Suivi commandes.
      </p>
    </div>
  `;
};

export const sendOrderEmails = async (reservation: Reservation) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;
  const adminEmail = process.env.ADMIN_ORDER_EMAIL || from;
  const clientEmail = reservation.user?.email;

  if (!transporter || !from || !adminEmail || !clientEmail) {
    console.warn(
      "Emails commande non envoyes: configurez GMAIL_USER, GMAIL_APP_PASSWORD et ADMIN_ORDER_EMAIL."
    );
    return;
  }

  const adminHtml = buildOrderHtml(reservation, "admin");
  const clientHtml = buildOrderHtml(reservation, "client");
  const subject = `Commande Beauty Place #${reservation.id}`;

  await transporter.sendMail({
    from,
    to: adminEmail,
    subject: `Nouvelle ${subject}`,
    html: adminHtml,
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    subject: `Facture et confirmation ${subject}`,
    html: clientHtml,
  });
};

export const sendTrackingUpdateEmail = async (reservation: Reservation) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;
  const clientEmail = reservation.user?.email;
  const trackingUrl = getTrackingUrl(
    reservation.shippingCarrier,
    reservation.trackingNumber
  );

  if (!transporter || !from || !clientEmail || !reservation.trackingNumber) {
    console.warn(
      "Email suivi non envoye: configurez Gmail et renseignez le numero de suivi."
    );
    return;
  }

  await transporter.sendMail({
    from,
    to: clientEmail,
    subject: `Votre colis Beauty Place est envoye #${reservation.id}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
        <h1 style="color:#5e2f4f;">Votre colis est envoye</h1>
        <p>Votre commande Beauty Place #${
          reservation.id
        } a ete confiee au transporteur.</p>
        <p><strong>Transporteur :</strong> ${
          reservation.shippingCarrier || "A definir"
        }</p>
        <p><strong>Numero de suivi :</strong> ${reservation.trackingNumber}</p>
        ${
          trackingUrl
            ? `<p><a href="${trackingUrl}" style="color:#5e2f4f;font-weight:bold;">Suivre mon colis</a></p>`
            : ""
        }
        <p>Le recapitulatif reste disponible dans votre espace client, rubrique Suivi commandes.</p>
      </div>
    `,
  });
};

export const sendOrderStatusUpdateEmail = async (reservation: Reservation) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;
  const clientEmail = reservation.user?.email;
  const trackingUrl = getTrackingUrl(
    reservation.shippingCarrier,
    reservation.trackingNumber
  );
  const statusLabel = statusLabels[reservation.status] || reservation.status;

  if (!transporter || !from || !clientEmail) {
    console.warn(
      "Email statut non envoye: configurez GMAIL_USER et GMAIL_APP_PASSWORD."
    );
    return;
  }

  await transporter.sendMail({
    from,
    to: clientEmail,
    subject: `Avancement de votre commande Beauty Place #${reservation.id}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
        <h1 style="color:#5e2f4f;">Votre commande avance</h1>
        <p>Bonjour ${reservation.user?.firstname ?? ""},</p>
        <p>Le statut de votre commande Beauty Place #${
          reservation.id
        } a ete mis a jour.</p>
        <p><strong>Nouveau statut :</strong> ${statusLabel}</p>
        <p><strong>Paiement :</strong> ${
          reservation.paymentStatus === "paid" ? "paye" : "a payer"
        }</p>
        <p><strong>Mode :</strong> ${getDeliveryLabel(reservation)}</p>
        ${
          reservation.shippingCarrier || reservation.trackingNumber
            ? `<p><strong>Transporteur :</strong> ${
                reservation.shippingCarrier || "A definir"
              }</p>
              <p><strong>Numero de suivi :</strong> ${
                reservation.trackingNumber || "A venir"
              }</p>`
            : ""
        }
        ${
          trackingUrl
            ? `<p><a href="${trackingUrl}" style="color:#5e2f4f;font-weight:bold;">Suivre mon colis</a></p>`
            : ""
        }
        <p>Le detail reste disponible dans votre espace client, rubrique Suivi et facture.</p>
        <p style="color:#76636c;">L'equipe BeautyPlace</p>
      </div>
    `,
  });
};

export const sendOrderReceivedEmail = async (reservation: Reservation) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;
  const adminEmail = process.env.ADMIN_ORDER_EMAIL || from;
  const clientName = `${reservation.user?.firstname ?? ""} ${
    reservation.user?.lastname ?? ""
  }`.trim();

  if (!transporter || !from || !adminEmail) {
    console.warn(
      "Email reception non envoye: configurez GMAIL_USER, GMAIL_APP_PASSWORD et ADMIN_ORDER_EMAIL."
    );
    return;
  }

  await transporter.sendMail({
    from,
    to: adminEmail,
    subject: `Commande reçue par le client #${reservation.id}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
        <h1 style="color:#5e2f4f;">Commande reçue par le client</h1>
        <p>Le client a confirme la reception de sa commande Beauty Place #${
          reservation.id
        }.</p>
        <p><strong>Client :</strong> ${clientName || "Client"}</p>
        <p><strong>Email :</strong> ${reservation.user?.email ?? ""}</p>
        <p><strong>Transporteur :</strong> ${
          reservation.shippingCarrier || "Non renseigne"
        }</p>
        <p><strong>Numero de suivi :</strong> ${
          reservation.trackingNumber || "Non renseigne"
        }</p>
        <p>Cette commande peut etre consideree comme traitee.</p>
      </div>
    `,
  });
};
