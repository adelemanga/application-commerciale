import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

const quickQuestions = [
  "Comment commander ?",
  "Delai de livraison",
  "Paiement Stripe",
  "Voir les produits",
  "Contacter l'admin",
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const containsAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const getBotAnswer = (message: string) => {
  const text = normalizeText(message);

  if (
    containsAny(text, [
      "livraison",
      "livre",
      "livrer",
      "delai",
      "combien de temps",
      "recevoir",
      "reception",
      "expedition",
    ])
  ) {
    return "Les commandes sont generalement preparees apres validation du paiement. Le delai depend de l'adresse et du mode choisi, mais vous pouvez compter environ 2 a 5 jours ou convenir d'un retrait/paiement sur place si l'administrateur le propose. Pour une date precise, envoyez votre adresse via le panier ou la page Contact.";
  }

  if (
    containsAny(text, [
      "paiement",
      "stripe",
      "carte",
      "payer",
      "cb",
      "visa",
      "mastercard",
      "sur place",
    ])
  ) {
    return "Le paiement par carte se fait avec Stripe depuis le panier. Connectez-vous, ajoutez vos produits, renseignez telephone et adresse, puis cliquez sur Payer avec Stripe.";
  }

  if (
    containsAny(text, [
      "commande",
      "commander",
      "panier",
      "acheter",
      "ajouter",
      "valider",
    ])
  ) {
    return "Pour commander, allez dans Boutique, ajoutez les produits au panier, puis validez dans Panier. La commande sera envoyee a l'administrateur apres paiement ou choix du paiement sur place.";
  }

  if (
    containsAny(text, [
      "produit",
      "boutique",
      "prix",
      "tarif",
      "manucure",
      "massage",
      "make up",
      "maquillage",
      "cheveux",
      "capillaire",
    ])
  ) {
    return "Les produits et les prix viennent de la base de donnees. Vous pouvez consulter la boutique et filtrer par manucure, massage, make up ou cheveux.";
  }

  if (
    containsAny(text, [
      "compte",
      "connexion",
      "inscription",
      "connecter",
      "mot de passe",
      "client",
      "profil",
    ])
  ) {
    return "La connexion client et l'inscription sont separees : utilisez Connexion pour un compte existant, ou Inscription pour creer un nouveau compte. Une fois connecte, votre nom, votre photo et votre historique apparaissent dans votre espace client.";
  }

  if (
    containsAny(text, [
      "annuler",
      "remboursement",
      "rembourser",
      "modifier",
      "changer",
      "erreur",
    ])
  ) {
    return "Pour modifier, annuler ou demander un remboursement, contactez l'administrateur avec votre nom, email et numero de commande. Le plus simple est de passer par la page Contact.";
  }

  if (
    containsAny(text, [
      "contact",
      "admin",
      "aide",
      "telephone",
      "mail",
      "email",
      "adresse",
    ])
  ) {
    return "Pour une demande precise, utilisez la page Contact. Votre message sera enregistre et l'administrateur pourra le consulter.";
  }

  return "Je n'ai pas encore une reponse parfaite, mais je peux deja vous orienter. Demandez-moi par exemple : delai de livraison, paiement Stripe, comment commander, prix des produits, creation de compte ou contact administrateur.";
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "Bonjour, je suis l'assistante Beauty Place. Comment puis-je vous aider ?",
    },
  ]);

  const nextId = useMemo(() => messages.length + 1, [messages.length]);

  const sendMessage = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextId, role: "user", text: cleanText },
      { id: nextId + 1, role: "bot", text: getBotAnswer(cleanText) },
    ]);
    setInput("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="chatbot">
      {isOpen && (
        <section className="chatbot-panel" aria-label="Assistant client">
          <div className="chatbot-header">
            <div>
              <span>
                <Sparkles aria-hidden="true" size={16} />
                Assistant
              </span>
              <p>Reponse rapide pour vos questions</p>
            </div>
            <button
              type="button"
              aria-label="Fermer le chatbot"
              onClick={() => setIsOpen(false)}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <p className={`chatbot-message ${message.role}`} key={message.id}>
                {message.text}
              </p>
            ))}
          </div>

          <div className="chatbot-quick-actions">
            {quickQuestions.map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => sendMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              aria-label="Votre question"
              placeholder="Ecrivez votre question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" aria-label="Envoyer la question">
              <Send aria-hidden="true" size={17} />
            </button>
          </form>

          <Link className="chatbot-contact-link" href="/contact">
            Contacter directement l'administrateur
          </Link>
        </section>
      )}

      <button
        type="button"
        className="chatbot-toggle"
        aria-label={isOpen ? "Fermer le chatbot" : "Ouvrir le chatbot"}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <MessageCircle aria-hidden="true" size={24} />
        <span>Aide</span>
      </button>
    </div>
  );
}
