import { ApolloProvider, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { CREATE_ADMIN } from "../graphql/mutations";
import { WHO_AM_I } from "../graphql/queries";

function InscriptionAdministrateurContent() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [message, setMessage] = useState("");
  const [createAdmin, { loading }] = useMutation(CREATE_ADMIN);

  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      await createAdmin({
        variables: {
          firstname,
          lastname,
          email,
          password,
          adminCode: adminCode || null,
        },
      });
      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/admin");
    } catch (error: any) {
      setMessage(
        error?.graphQLErrors?.[0]?.message ||
          "Impossible de creer ce compte administrateur."
      );
    }
  };

  return (
    <main className="auth-page admin-auth-page">
      <section className="auth-panel admin-auth-panel admin-registration-panel">
        <p className="shop-kicker">Administration</p>
        <h1>Inscription administrateur</h1>
        <p className="auth-helper">
          Cette inscription est reservee a l'equipe. Utilisez le code
          administrateur ou connectez-vous d'abord avec un compte admin existant.
        </p>
        <form className="auth-form" onSubmit={submitAdmin}>
          <div className="auth-two-columns">
            <label>
              Prenom
              <input
                required
                value={firstname}
                onChange={(event) => setFirstname(event.target.value)}
              />
            </label>
            <label>
              Nom
              <input
                required
                value={lastname}
                onChange={(event) => setLastname(event.target.value)}
              />
            </label>
          </div>
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
            Mot de passe
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Code administrateur
            <input
              type="password"
              autoComplete="off"
              value={adminCode}
              onChange={(event) => setAdminCode(event.target.value)}
            />
          </label>
          {message && <p className="auth-error">{message}</p>}
          <button type="submit" disabled={loading}>
            Creer le compte administrateur
          </button>
        </form>
        <div className="auth-link-row">
          <Link className="auth-secondary-link" href="/connexion-administrateur">
            Deja admin
          </Link>
          <Link className="auth-secondary-link" href="/admin">
            Ouvrir l'interface
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function InscriptionAdministrateurPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <InscriptionAdministrateurContent />
      <Footer />
    </ApolloProvider>
  );
}
