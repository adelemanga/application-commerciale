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

const buildOrderHtml = (reservation: Reservation) => {
  const total = calculateTotal(reservation.articles ?? []);
  const products = reservation.articles
    .map(
      (article) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ead8cf;">${
            article.product?.name ?? "Produit"
          }</td>
          <td style="padding:8px 0;border-bottom:1px solid #ead8cf;text-align:right;">${formatPrice(
            article.product?.price
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
      <h1 style="color:#5e2f4f;">Nouvelle commande Beauty Place</h1>
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
      <table style="width:100%;border-collapse:collapse;margin:18px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #5e2f4f;">Produit</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #5e2f4f;">Prix</th>
          </tr>
        </thead>
        <tbody>${products}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total :</strong> ${formatPrice(total)}</p>
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

  const html = buildOrderHtml(reservation);
  const subject = `Commande Beauty Place #${reservation.id}`;

  await transporter.sendMail({
    from,
    to: adminEmail,
    subject: `Nouvelle ${subject}`,
    html,
  });

  await transporter.sendMail({
    from,
    to: clientEmail,
    subject: `Confirmation ${subject}`,
    html,
  });
};
