import { useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useState } from "react";
import { ADD_ADVICE } from "../graphql/mutations";
import {
  GET_ALL_ADVICES,
  GET_RESERVATIONS_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";
import { Role } from "../interface/types";

const DEFAULT_ADVICE_IMAGE =
  "https://img.freepik.com/premium-vector/default-image-icon-vector-missing-picture-page-website-design-mobile-app-no-photo-available_87543-11093.jpg";

const resizeAdvicePhoto = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 320;
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

function Advice() {
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    message: "",
    imgUrl: "",
    rating: 0,
    title: "",
  });

  const [imageURL, setImageURL] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");

  const [addAvis, { loading, error }] = useMutation(ADD_ADVICE, {
    refetchQueries: [{ query: GET_ALL_ADVICES }],
  });
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "cache-and-network",
  });
  const isClient =
    userData?.whoAmI?.isLoggedIn && userData?.whoAmI?.role === Role.User;
  const { data: reservationsData, loading: loadingReservations } = useQuery(
    GET_RESERVATIONS_BY_USER_ID,
    {
      fetchPolicy: "network-only",
      skip: !isClient,
    }
  );
  const canLeaveAdvice =
    isClient &&
    (reservationsData?.getReservationsByUserId ?? []).some((item: any) => {
      const reservation = item.reservation;

      return (
        reservation?.paymentStatus === "paid" &&
        reservation?.status === "ended" &&
        item.totalPrice > 0
      );
    });

  // Gestion du formulaire
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormError("");
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Gestion de la note (étoiles)
  const handleRatingChange = (value: number) => {
    setFormError("");
    setFormData({
      ...formData,
      rating: value,
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError("");
    setSuccessMessage("");
    setFormError("");

    if (!file) {
      setImageURL(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Selectionnez une vraie image.");
      return;
    }

    resizeAdvicePhoto(file)
      .then(setImageURL)
      .catch(() => {
        setImageError("Impossible de lire cette image.");
      });
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError("");
    setFormError("");
    setSuccessMessage("");

    if (!imageURL) {
      const message = "Ajoutez une photo avant d'envoyer votre avis.";
      setImageError(message);
      window.alert(message);
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.lastname.trim() ||
      !formData.title.trim() ||
      !formData.message.trim() ||
      formData.rating < 1
    ) {
      setFormError("Remplissez tous les champs et choisissez une note avant d'envoyer votre avis.");
      return;
    }

    // Mettre à jour formData avec l'URL de l'image téléchargée
    const formDataWithImg = {
      ...formData,
      name: formData.name.trim(),
      lastname: formData.lastname.trim(),
      message: formData.message.trim(),
      title: formData.title.trim(),
      imgUrl: imageURL,
    };

    try {
      await addAvis({ variables: formDataWithImg });
      setSuccessMessage("Votre message a été envoyé avec succès !");
      setFormData({
        name: "",
        lastname: "",
        message: "",
        imgUrl: "",
        rating: 0,
        title: "",
      });
      setImageURL(null); // Réinitialisez l'URL de l'image
    } catch (err) {
      console.error("Erreur lors de l'envoi :", err);
    }
  };

  return (
    <section className="customer-advice-form-section">
      <div className="advice-form-heading">
        <p className="shop-kicker">Avis clients</p>
        <h1>Laissez votre avis</h1>
      </div>

      {(loadingUser || loadingReservations) && (
        <p className="shop-message">Verification de votre achat...</p>
      )}

      {!loadingUser && !isClient && (
        <div className="verified-review-lock">
          <strong>Connexion requise pour écrire un avis</strong>
          <p>
            Tous les visiteurs peuvent lire les avis. Pour commenter, il faut
            être client BeautyPlace et avoir reçu une commande payée.
          </p>
          <Link href="/connexion-client">Me connecter</Link>
        </div>
      )}

      {!loadingReservations && isClient && !canLeaveAdvice && (
        <div className="verified-review-lock">
          <strong>Avis disponible après réception</strong>
          <p>
            Vous pouvez lire tous les avis. Le formulaire sera disponible quand
            une de vos commandes payées sera marquée comme reçue.
          </p>
          <Link href="/suivi-commandes">Voir mon suivi</Link>
        </div>
      )}

      {canLeaveAdvice && (
      <form className="avis" onSubmit={handleSubmit}>
        <div className={`advice-upload${imageError ? " is-invalid" : ""}`}>
          <img
            src={imageURL || DEFAULT_ADVICE_IMAGE}
            alt="Photo de profil"
          />
          <label htmlFor="advice-image">Ajouter une photo</label>
          <input
            id="advice-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
          {imageError && <p className="error-message">{imageError}</p>}
        </div>

        {/* Formulaire */}
        <div className="form-group">
          <label htmlFor="name">Nom :</label>
          <input
            type="text"
            id="name1"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastname">Prénom :</label>
          <input
            type="text"
            id="lastname"
            name="lastname"
            value={formData.lastname}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Titre de l'avis :</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rating">Évaluation :</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <span
                key={value}
                onClick={() => handleRatingChange(value)}
                className={value <= formData.rating ? "star active" : "star"}
              >
                &#9733;
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="message">Votre Avis :</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Envoi en cours..." : "Envoyer"}
        </button>

        {formError && <p className="error-message">{formError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">Une erreur est survenue.</p>}
      </form>
      )}

    </section>
  );
}

export default Advice;
