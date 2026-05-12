import { ApolloProvider, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { CREATE_NEW_USER } from "../graphql/mutations";
import { WHO_AM_I } from "../graphql/queries";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneHelperText,
} from "../utils/phone";

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
  const [firstnameError, setFirstnameError] = useState("");
  const [lastnameError, setLastnameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [createUser, { loading }] = useMutation(CREATE_NEW_USER);

  const validateRequiredFields = () => {
    const cleanFirstname = firstname.trim();
    const cleanLastname = lastname.trim();
    const cleanEmail = email.trim();
    const cleanAddress = address.trim();

    if (!cleanFirstname) return "Le prenom est obligatoire.";
    if (!cleanLastname) return "Le nom est obligatoire.";
    if (!cleanEmail) return "L'email est obligatoire.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return "Entrez une adresse email valide.";
    }
    if (!phone.trim()) return "Le telephone est obligatoire.";
    if (!isValidPhoneNumber(phone)) return phoneHelperText;
    if (!cleanAddress) return "L'adresse de livraison est obligatoire.";
    if (!password.trim()) return "Le mot de passe est obligatoire.";
    if (password.trim().length < 6) {
      return "Le mot de passe doit contenir au moins 6 caracteres.";
    }
    if (!confirmPassword.trim()) {
      return "Confirmez votre mot de passe.";
    }
    if (password !== confirmPassword) {
      return "Les mots de passe ne correspondent pas.";
    }

    return "";
  };

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
    setFirstnameError("");
    setLastnameError("");
    setPhoneError("");

    const validationMessage = validateRequiredFields();
    if (validationMessage) {
      if (validationMessage === "Le prenom est obligatoire.") {
        setFirstnameError(validationMessage);
      }
      if (validationMessage === "Le nom est obligatoire.") {
        setLastnameError(validationMessage);
      }
      if (
        validationMessage === "Le telephone est obligatoire." ||
        validationMessage === phoneHelperText
      ) {
        setPhoneError(validationMessage);
      }
      setMessage(validationMessage);
      return;
    }

    const fullAddress = [address, addressComplement].filter(Boolean).join(", ");

    try {
      await createUser({
        variables: {
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim().toLowerCase(),
          phone: normalizePhoneNumber(phone),
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
        <p className="auth-helper">
          Creez votre compte BeautyPlace. La connexion client se fait sur une
          page separee.
        </p>
        <form className="auth-form" onSubmit={submitRegistration} noValidate>
          <label>
            Prenom
            <input
              required
              autoComplete="given-name"
              value={firstname}
              onChange={(event) => {
                setFirstname(event.target.value);
                setFirstnameError("");
              }}
            />
            {firstnameError && (
              <span className="field-error">{firstnameError}</span>
            )}
          </label>
          <label>
            Nom
            <input
              required
              autoComplete="family-name"
              value={lastname}
              onChange={(event) => {
                setLastname(event.target.value);
                setLastnameError("");
              }}
            />
            {lastnameError && <span className="field-error">{lastnameError}</span>}
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
              inputMode="tel"
              placeholder="Ex : 06 12 34 56 78"
              pattern="0[1-9][0-9]{8}"
              title={phoneHelperText}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setPhoneError("");
              }}
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
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
        <div className="auth-bottom-switch">
          <span>Vous avez deja un compte ?</span>
          <Link href="/connexion-client">Se connecter</Link>
        </div>
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
