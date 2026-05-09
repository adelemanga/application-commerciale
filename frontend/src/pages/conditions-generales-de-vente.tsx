import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function CgvPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Conditions de vente"
        title="Conditions generales de vente"
        intro="Ces conditions encadrent de maniere fictive les commandes passees sur BeautyPlace."
        sections={[
          {
            title: "Objet",
            content: [
              "Les presentes conditions generales de vente definissent les droits et obligations fictifs entre BeautyPlace et ses clients.",
              "Elles s'appliquent aux produits de beaute proposes sur le site : manucure, massage, maquillage et soins capillaires.",
            ],
          },
          {
            title: "Produits et prix",
            content: [
              "Les produits affiches sont presentes avec une description, une image, une categorie, un prix et un stock disponible.",
              "Les prix sont indiques en euros toutes taxes comprises, sauf mention contraire fictive.",
            ],
          },
          {
            title: "Commande",
            content: [
              "Le client ajoute les produits au panier, choisit un mode de paiement, puis confirme sa commande.",
              "Une commande payee en ligne est transmise automatiquement a l'administration. Une reservation sur place est transmise apres validation de la date de retrait.",
            ],
          },
          {
            title: "Paiement",
            content: [
              "Le paiement par carte bancaire est effectue via Stripe sur une page securisee.",
              "Le paiement sur place est disponible uniquement pour les commandes a retirer en boutique. Aucun colis n'est expedie pour ce mode.",
            ],
          },
          {
            title: "Facture et confirmation",
            content: [
              "Un recu ou une facture fictive peut etre genere depuis l'espace client apres validation de la commande.",
              "Les emails automatiques dependent de la configuration reelle de l'adresse d'envoi.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
