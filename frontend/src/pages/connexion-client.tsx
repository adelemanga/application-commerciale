import { ApolloProvider, useLazyQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { REQUEST_PASSWORD_RESET_CODE } from "../graphql/mutations";
import { LOGIN_CLIENT, WHO_AM_I } from "../graphql/queries";

function ConnexionClientContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetChannel, setResetChannel] = useState("email");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loginClient, { loading }] = useLazyQuery(LOGIN_CLIENT, {
    fetchPolicy: "network-only",
  });
  const [requestPasswordResetCode, { loading: resetLoading }] = useMutation(
    REQUEST_PASSWORD_RESET_CODE
  );

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await loginClient({
        variables: {
          email: email.trim().toLowerCase(),
          password: password.trim(),
        },
      });

      if (result.error) {
        throw result.error;
      }

      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/clients");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setMessage(
        errorMessage ||
          "Connexion client refusee. Verifiez votre email et votre mot de passe."
      );
    }
  };

  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");

    try {
      const targetEmail = (resetEmail || email).trim().toLowerCase();
      if (!targetEmail) {
        setResetMessage("Indiquez votre email pour recevoir le code.");
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
    <main className="auth-page client-auth-page">
      <section className="client-auth-layout separated-auth-layout">
        <section className="auth-panel login-panel">
          <p className="shop-kicker">Connexion client</p>
          <h1>Je me connecte</h1>
          <p className="auth-helper">
            Accedez a votre espace BeautyPlace pour retrouver votre profil,
            votre panier, vos commandes et vos messages.
          </p>
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Mot de passe
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
              Acceder a mon compte
            </button>
          </form>

          <form className="password-reset-panel" onSubmit={submitPasswordReset}>
            <div>
              <h2>Mot de passe oublie ?</h2>
              <p>
                Recevez un code a 6 chiffres par email ou SMS pour creer un
                nouveau mot de passe.
              </p>
            </div>
            <label>
              Email de recuperation
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder={email || "votre@email.com"}
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
        </section>

        <section className="auth-panel auth-switch-panel">
          <p className="shop-kicker">Premiere visite</p>
          <h2>Pas encore de compte ?</h2>
          <p className="auth-helper">
            Creez votre compte client sur une page separee pour enregistrer vos
            informations, suivre vos commandes et recevoir les messages de
            BeautyPlace.
          </p>
          <Link className="auth-switch-button" href="/inscription-client">
            Creer mon compte client
          </Link>
        </section>
      </section>
    </main>
  );
}

export default function ConnexionClientPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ConnexionClientContent />
      <Footer />
    </ApolloProvider>
  );
}
