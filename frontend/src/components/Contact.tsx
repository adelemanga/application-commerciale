import { useMutation } from "@apollo/client";
import { useState } from "react";
import { ADD_CONTACT } from "../graphql/mutations";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    message: "",
  });

  const [successMessage, setSuccessMessage] = useState("");

  const [addContact, { loading, error }] = useMutation(ADD_CONTACT);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addContact({ variables: formData });
      setSuccessMessage("Votre message a été envoyé avec succès !");
      setFormData({ name: "", lastname: "", email: "", message: "" }); // Réinitialiser le formulaire
    } catch (err) {
      console.error("Erreur lors de l'envoi du formulaire :", err);
    }
  };

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-copy">
          <p className="beauty-eyebrow">Contact</p>
          <h1>Parlons de votre prochain moment beaute</h1>
          <p>
            Une question sur un produit, une prestation ou une commande ? Envoyez
            votre message et nous vous repondrons avec soin.
          </p>
          <div className="contact-details">
            <article>
              <span>Email</span>
              <a href="mailto:adelemanga75@gmail.com">adelemanga75@gmail.com</a>
            </article>
            <article>
              <span>Ambiance</span>
              <p>Soins, produits beaute, conseils et accompagnement client.</p>
            </article>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-heading">
            <p className="beauty-eyebrow">Message</p>
            <h2>Ecrivez-nous</h2>
          </div>

          <div className="contact-fields">
            <div className="form-group">
              <label htmlFor="name">Nom</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastname">Prenom</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Envoi en cours..." : "Envoyer le message"}
          </button>

          {successMessage && <p className="success-message">{successMessage}</p>}
          {error && (
            <p className="error-message">
              Une erreur est survenue, veuillez reessayer.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default Contact;

/*
        <img
          src="https://adelemanga-portfolio.netlify.app/static/media/girlme.0acab6167e7db055cb7a.png"
          alt="Original Image"
          className="clone-1"
        />
*/
