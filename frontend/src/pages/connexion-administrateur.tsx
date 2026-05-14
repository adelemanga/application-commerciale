import { ApolloProvider, useLazyQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  REQUEST_PASSWORD_RESET_CODE,
  RESET_PASSWORD_WITH_CODE,
} from "../graphql/mutations";
import { LOGIN_ADMIN, WHO_AM_I } from "../graphql/queries";

function ConnexionAdministrateurContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [loginAdmin, { loading }] = useLazyQuery(LOGIN_ADMIN, {
    fetchPolicy: "network-only",
  });
  const [requestPasswordResetCode, { loading: resetLoading }] = useMutation(
    REQUEST_PASSWORD_RESET_CODE
  );
  const [resetPasswordWithCode, { loading: changingPassword }] = useMutation(
    RESET_PASSWORD_WITH_CODE
  );

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await loginAdmin({
        variables: {
          email: email.trim().toLowerCase(),
          password: password.trim(),
        },
      });
      if (result.error) {
        throw result.error;
      }
      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/admin");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setMessage(
        errorMessage ||
          "Connexion administrateur refusee. Ce compte n'a pas les droits admin."
      );
    }
  };

  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    setPasswordChangeMessage("");

    try {
      const targetEmail = (resetEmail || email).trim().toLowerCase();
      if (!targetEmail) {
        setResetMessage("Indiquez l'email administrateur.");
        return;
      }

      const result = await requestPasswordResetCode({
        variables: {
          email: targetEmail,
          channel: "email",
          frontendUrl: window.location.origin,
        },
      });

      setResetMessage(
        result.data?.requestPasswordResetCode || "Code de récupération envoyé."
      );
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setResetMessage(
        errorMessage ||
          "Impossible d'envoyer le code de recuperation pour le moment."
      );
    }
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    setPasswordChangeMessage("");

    const targetEmail = (resetEmail || email).trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!targetEmail) {
      setPasswordChangeMessage(
        "Indiquez l'email administrateur avant de valider."
      );
      return;
    }

    if (!cleanCode) {
      setPasswordChangeMessage(
        "Saisissez le code a 6 chiffres recu par email."
      );
      return;
    }

    if (newPassword.trim().length < 6) {
      setPasswordChangeMessage(
        "Le nouveau mot de passe doit contenir au moins 6 caracteres."
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    try {
      const result = await resetPasswordWithCode({
        variables: {
          email: targetEmail,
          code: cleanCode,
          password: newPassword,
        },
      });

      setPasswordChangeMessage(
        result.data?.resetPasswordWithCode ||
          "Mot de passe modifie. Vous pouvez vous connecter."
      );
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setPasswordChangeMessage(
        errorMessage || "Impossible de modifier ce mot de passe."
      );
    }
  };

  return (
    <main className="auth-page admin-auth-page">
      <section className="auth-panel admin-auth-panel">
        <p className="shop-kicker">Administration</p>
        <h1>Connexion administrateur</h1>
        <form className="auth-form" onSubmit={submitLogin}>
          <label>
            Email administrateur
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="exemple@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Mot de passe administrateur
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="auth-error">{message}</p>}
          <button type="submit" disabled={loading}>
            Acceder à l'administration
          </button>
        </form>
        <section className="password-reset-dropdown">
          <button
            type="button"
            className="password-reset-toggle"
            aria-expanded={isResetOpen}
            onClick={() => setIsResetOpen((current) => !current)}
          >
            Mot de passe oublie ?<span>{isResetOpen ? "−" : "+"}</span>
          </button>

          {isResetOpen && (
            <div className="password-reset-content">
              <form
                className="password-reset-panel"
                onSubmit={submitPasswordReset}
              >
                <div>
                  <h2>Recevoir un code</h2>
                  <p>
                    Recevez un code a 6 chiffres par email pour definir un
                    nouveau mot de passe administrateur.
                  </p>
                </div>
                <label>
                  Email administrateur
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="exemple@gmail.com"
                  />
                </label>
                {resetMessage && <p className="auth-info">{resetMessage}</p>}
                <button type="submit" disabled={resetLoading}>
                  Recevoir le code
                </button>
              </form>

              <form
                className="password-reset-panel"
                onSubmit={submitNewPassword}
              >
                <div>
                  <h2>Saisir le code recu</h2>
                  <p>
                    Entrez le code envoye par email, puis choisissez votre
                    nouveau mot de passe administrateur.
                  </p>
                </div>
                <label>
                  Code a 6 chiffres
                  <input
                    inputMode="numeric"
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value)}
                    placeholder="123456"
                  />
                </label>
                <label>
                  Nouveau mot de passe
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
                <label>
                  Confirmer le mot de passe
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(event) =>
                      setConfirmNewPassword(event.target.value)
                    }
                  />
                </label>
                {passwordChangeMessage && (
                  <p className="auth-info">{passwordChangeMessage}</p>
                )}
                <button type="submit" disabled={changingPassword}>
                  {changingPassword
                    ? "Verification..."
                    : "Changer mon mot de passe"}
                </button>
              </form>
            </div>
          )}
        </section>
        <Link className="auth-secondary-link" href="/admin">
          Ouvrir l'interface admin
        </Link>
        <Link
          className="auth-secondary-link"
          href="/inscription-administrateur"
        >
          Inscrire un administrateur
        </Link>
      </section>
    </main>
  );
}

export default function ConnexionAdministrateurPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ConnexionAdministrateurContent />
      <Footer />
    </ApolloProvider>
  );
}
