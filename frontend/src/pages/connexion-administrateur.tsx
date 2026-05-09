import { ApolloProvider, useLazyQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { LOGIN_ADMIN, WHO_AM_I } from "../graphql/queries";

function ConnexionAdministrateurContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loginAdmin, { loading }] = useLazyQuery(LOGIN_ADMIN, {
    fetchPolicy: "network-only",
  });

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
