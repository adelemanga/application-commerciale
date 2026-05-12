import { ApolloProvider, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { RESET_PASSWORD, RESET_PASSWORD_WITH_CODE } from "../graphql/mutations";

function ResetPasswordContent() {
  const router = useRouter();
  const email = useMemo(() => {
    const value = router.query.email;
    return typeof value === "string" ? value : "";
  }, [router.query.email]);
  const token = useMemo(() => {
    const value = router.query.token;
    return typeof value === "string" ? value : "";
  }, [router.query.token]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailInput, setEmailInput] = useState(email);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [resetPasswordWithCode, { loading: loadingCode }] = useMutation(
    RESET_PASSWORD_WITH_CODE
  );
  const activeEmail = email || emailInput.trim().toLowerCase();

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!activeEmail) {
      setMessage("Indiquez votre email.");
      return;
    }

    if (!token && !code.trim()) {
      setMessage("Saisissez le code a 6 chiffres recu par email.");
      return;
    }

    if (password.trim().length < 6) {
      setMessage("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    try {
      const result = token
        ? await resetPassword({
            variables: {
              email: activeEmail,
              token,
              password,
            },
          })
        : await resetPasswordWithCode({
            variables: {
              email: activeEmail,
              code: code.trim(),
              password,
            },
          });
      setIsSuccess(true);
      setMessage(
        result.data?.resetPasswordWithCode ||
          result.data?.resetPassword ||
          "Mot de passe mis a jour. Vous pouvez vous connecter."
      );
      setPassword("");
      setConfirmPassword("");
      setCode("");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setMessage(errorMessage || "Impossible de modifier ce mot de passe.");
    }
  };

  return (
    <main className="auth-page client-auth-page">
      <section className="auth-panel password-reset-page">
        <p className="shop-kicker">Recuperation</p>
        <h1>Nouveau mot de passe</h1>
        <p className="auth-helper">
          Choisissez un nouveau mot de passe pour retrouver l'acces a votre
          compte BeautyPlace. Vous pouvez utiliser le lien securise ou le code
          a 6 chiffres recu par email.
        </p>
        <form className="auth-form" onSubmit={submitReset}>
          <label>
            Email
            <input
              required
              type="email"
              value={activeEmail}
              readOnly={Boolean(email)}
              onChange={(event) => setEmailInput(event.target.value)}
            />
          </label>
          {!token && (
            <label>
              Code de recuperation
              <input
                required
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
              />
            </label>
          )}
          <label>
            Nouveau mot de passe
            <input
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {message && (
            <p className={isSuccess ? "auth-info" : "auth-error"}>{message}</p>
          )}
          <button type="submit" disabled={loading || loadingCode || isSuccess}>
            Enregistrer mon nouveau mot de passe
          </button>
        </form>
        {isSuccess && (
          <div className="auth-link-row">
            <Link className="auth-secondary-link" href="/connexion-client">
              Connexion client
            </Link>
            <Link className="auth-secondary-link" href="/connexion-administrateur">
              Connexion admin
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ResetPasswordContent />
      <Footer />
    </ApolloProvider>
  );
}
