import { ApolloProvider, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { CREATE_NEW_USER } from "../graphql/mutations";
import { WHO_AM_I } from "../graphql/queries";

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

function InscriptionClientContent() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [address, setAddress] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [createUser, { loading }] = useMutation(CREATE_NEW_USER);

  const selectAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMessage("");

    if (!file) {
      setAvatarUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Selectionnez une photo valide.");
      return;
    }

    resizeProfilePhoto(file)
      .then(setAvatarUrl)
      .catch(() => {
      setMessage("Impossible de lire cette photo.");
      });
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    const fullAddress = [address, addressComplement].filter(Boolean).join(", ");

    try {
      await createUser({
        variables: {
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: fullAddress,
          avatarUrl,
          password,
        },
      });
      await client.refetchQueries({ include: [WHO_AM_I] });
      router.push("/produits");
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message;
      setMessage(
        errorMessage || "Impossible de creer ce compte client. Verifiez les informations."
      );
    }
  };

  return (
    <main className="auth-page registration-page">
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
          <AddressAutocomplete
            required
            label="Adresse de livraison"
            value={address}
            onChange={setAddress}
            placeholder="Region, ville, code postal, rue ou adresse complete"
          />
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          {message && <p className="auth-error">{message}</p>}
          <button type="submit" disabled={loading}>
            Creer mon compte
          </button>
        </form>
      </section>
    </main>
  );
}

export default function InscriptionClientPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <InscriptionClientContent />
      <Footer />
    </ApolloProvider>
  );
}
