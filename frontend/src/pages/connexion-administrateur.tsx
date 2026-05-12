import { ApolloProvider, useLazyQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { REQUEST_PASSWORD_RESET_CODE } from "../graphql/mutations";
import { LOGIN_ADMIN, WHO_AM_I } from "../graphql/queries";

function ConnexionAdministrateurContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetChannel, setResetChannel] = useState("email");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loginAdmin, { loading }] = useLazyQuery(LOGIN_ADMIN, {
    fetchPolicy: "network-only",
  });
  const [requestPasswordResetCode, { loading: resetLoading }] = useMutation(
    REQUEST_PASSWORD_RESET_CODE
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

    try {
      const targetEmail = (resetEmail || email).trim().toLowerCase();
      if (!targetEmail) {
        setResetMessage("Indiquez l'email administrateur.");
        return;
      }

      const result = await requestPasswordResetCode({
        variables: {
          email: targetEmail,
          channel: resetChannel,
          frontendUrl: window.location.origin,
        },
      });

      setResetMessage(
        result.data?.requestPasswordResetCode ||
          "Code de recuperation envoye."
      );
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setResetMessage(
        errorMessage ||
          "Impossible d'envoyer le code de recuperation pour le moment."
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
            Acceder a l'administration
          </button>
        </form>
        <form className="password-reset-panel" onSubmit={submitPasswordReset}>
          <div>
            <h2>Mot de passe oublie ?</h2>
            <p>
              Recevez un code a 6 chiffres par email ou SMS pour definir un
              nouveau mot de passe administrateur.
            </p>
          </div>
          <label>
            Email administrateur
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder={email || "admin@email.com"}
            />
          </label>
          <div className="reset-channel-options" role="group" aria-label="Mode de recuperation">
            <button
              type="button"
              className={resetChannel === "email" ? "active" : ""}
              onClick={() => setResetChannel("email")}
            >
              Email
            </button>
            <button
              type="button"
              className={resetChannel === "sms" ? "active" : ""}
              onClick={() => setResetChannel("sms")}
            >
              SMS
            </button>
          </div>
          {resetMessage && <p className="auth-info">{resetMessage}</p>}
          <button type="submit" disabled={resetLoading}>
            Recevoir le code
          </button>
          <Link className="auth-secondary-link" href="/reinitialiser-mot-de-passe">
            J'ai deja un code
          </Link>
        </form>
        <Link className="auth-secondary-link" href="/admin">
          Ouvrir l'interface admin
        </Link>
        <Link className="auth-secondary-link" href="/inscription-administrateur">
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
