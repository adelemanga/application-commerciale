import { ApolloProvider, useLazyQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { deliveryCities, getDeliveryAddress } from "@/data/deliveryAddresses";
import client from "../graphql/client";
import { CREATE_NEW_USER } from "../graphql/mutations";
import { LOGIN_CLIENT, WHO_AM_I } from "../graphql/queries";

const defaultCity = deliveryCities[0];

const resizeProfilePhoto = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 260;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;

        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, x, y, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function ConnexionClientContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [city, setCity] = useState(defaultCity.name);
  const [street, setStreet] = useState(defaultCity.streets[0]);
  const [addressComplement, setAddressComplement] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const [loginClient, { loading }] = useLazyQuery(LOGIN_CLIENT, {
    fetchPolicy: "network-only",
  });
  const [createUser, { loading: registering }] = useMutation(CREATE_NEW_USER);
  const selectedCity =
    deliveryCities.find((deliveryCity) => deliveryCity.name === city) ||
    defaultCity;

  const handleCityChange = (nextCity: string) => {
    const deliveryCity =
      deliveryCities.find((item) => item.name === nextCity) || defaultCity;
    setCity(deliveryCity.name);
    setStreet(deliveryCity.streets[0]);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await loginClient({
        variables: {
          email,
          password,
        },
      });
      if (result.error) {
        throw result.error;
      }
      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/clients");
    } catch {
      setMessage("Connexion client refusee. Verifiez votre email et mot de passe.");
    }
  };

  const selectAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setRegisterMessage("");

    if (!file) {
      setAvatarUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setRegisterMessage("Selectionnez une photo valide.");
      return;
    }

    resizeProfilePhoto(file)
      .then(setAvatarUrl)
      .catch(() => {
      setRegisterMessage("Impossible de lire cette photo.");
      });
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterMessage("");

    if (registerPassword !== confirmPassword) {
      setRegisterMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    const address = getDeliveryAddress(street, city, addressComplement);

    try {
      await createUser({
        variables: {
          firstname,
          lastname,
          email: registerEmail,
          phone,
          address,
          avatarUrl,
          password: registerPassword,
        },
      });
      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/produits");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setRegisterMessage(
        errorMessage || "Impossible de creer ce compte client. Verifiez les informations."
      );
    }
  };

  return (
    <main className="auth-page client-auth-page">
      <section className="client-auth-layout">
      <section className="auth-panel">
        <p className="shop-kicker">Espace client</p>
        <h1>Connexion client</h1>
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
            Se connecter
          </button>
        </form>
      </section>

      <section className="auth-panel registration-panel">
        <p className="shop-kicker">Nouveau compte</p>
        <h1>Inscription client</h1>
        <form className="auth-form" onSubmit={submitRegistration}>
          <label>
            Prenom
            <input
              required
              autoComplete="given-name"
              value={firstname}
              onChange={(event) => setFirstname(event.target.value)}
            />
          </label>
          <label>
            Nom
            <input
              required
              autoComplete="family-name"
              value={lastname}
              onChange={(event) => setLastname(event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
            />
          </label>
          <label>
            Telephone
            <input
              required
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label>
            Photo de profil
            <input type="file" accept="image/*" onChange={selectAvatarFile} />
          </label>
          {avatarUrl && (
            <img
              className="profile-photo-preview"
              src={avatarUrl}
              alt="Apercu du profil"
            />
          )}
          <label>
            Ville
            <select
              required
              value={city}
              onChange={(event) => handleCityChange(event.target.value)}
            >
              {deliveryCities.map((deliveryCity) => (
                <option key={deliveryCity.name} value={deliveryCity.name}>
                  {deliveryCity.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Code postal
            <input required readOnly value={selectedCity.postalCode} />
          </label>
          <label>
            Adresse
            <select
              required
              autoComplete="street-address"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
            >
              {selectedCity.streets.map((streetName) => (
                <option key={streetName} value={streetName}>
                  {streetName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Complement d'adresse
            <input
              autoComplete="address-line2"
              placeholder="Batiment, etage, appartement..."
              value={addressComplement}
              onChange={(event) => setAddressComplement(event.target.value)}
            />
          </label>
          <label>
            Mot de passe
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
            />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {registerMessage && <p className="auth-error">{registerMessage}</p>}
          <button type="submit" disabled={registering}>
            Creer mon compte
          </button>
        </form>
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
