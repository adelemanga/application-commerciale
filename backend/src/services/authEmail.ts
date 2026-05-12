import nodemailer from "nodemailer";
import { User } from "../entities/User";

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

export const sendPasswordResetEmail = async (user: User, resetUrl: string) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;

  if (!transporter || !from) {
    throw new Error(
      "Email de recuperation non envoye: configurez GMAIL_USER et GMAIL_APP_PASSWORD."
    );
  }

  await transporter.sendMail({
    from,
    to: user.email,
    subject: "Reinitialisation de votre mot de passe BeautyPlace",
    html: `
      <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
        <h1 style="color:#5e2f4f;">Reinitialisation du mot de passe</h1>
        <p>Bonjour ${user.firstname || ""},</p>
        <p>Vous avez demande a recuperer l'acces a votre compte BeautyPlace.</p>
        <p>
          <strong>Identifiant de connexion :</strong> ${user.email}
        </p>
        <p>
          Pour votre securite, votre ancien mot de passe n'est jamais envoye par email.
          Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.
        </p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#5e2f4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Creer un nouveau mot de passe
          </a>
        </p>
        <p>Ce lien expire dans 1 heure. Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.</p>
        <p style="color:#76636c;">L'equipe BeautyPlace</p>
      </div>
    `,
  });
};

export const sendPasswordResetCodeEmail = async (
  user: User,
  code: string,
  resetUrl: string
) => {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;

  if (!transporter || !from) {
    throw new Error(
      "Email de recuperation non envoye: configurez GMAIL_USER et GMAIL_APP_PASSWORD."
    );
  }

  await transporter.sendMail({
    from,
    to: user.email,
    subject: "Code de recuperation BeautyPlace",
    html: `
      <div style="font-family:Arial,sans-serif;color:#261922;line-height:1.5;">
        <h1 style="color:#5e2f4f;">Code de recuperation</h1>
        <p>Bonjour ${user.firstname || ""},</p>
        <p>Voici votre code pour creer un nouveau mot de passe BeautyPlace.</p>
        <p><strong>Identifiant de connexion :</strong> ${user.email}</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#5e2f4f;">${code}</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#5e2f4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Saisir le code et changer mon mot de passe
          </a>
        </p>
        <p>Ce code expire dans 15 minutes. Ne le partagez avec personne.</p>
        <p style="color:#76636c;">L'equipe BeautyPlace</p>
      </div>
    `,
  });
};
