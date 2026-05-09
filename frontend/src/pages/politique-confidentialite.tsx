import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function PolitiqueConfidentialitePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Donnees personnelles"
        title="Politique de confidentialite"
        intro="Cette politique explique de facon provisoire comment BeautyPlace traite les donnees personnelles."
        sections={[
          {
            title: "Donnees collectees",
            content: [
              "BeautyPlace peut collecter le prenom, le nom, l'email, le telephone, l'adresse, les informations de commande et l'historique client.",
              "Les donnees bancaires ne sont pas stockees sur le site : le paiement carte est gere par Stripe.",
            ],
          },
          {
            title: "Utilisation des donnees",
            content: [
              "Les donnees servent a creer un compte client, traiter une commande, envoyer un recu, gerer le suivi et contacter le client si necessaire.",
              "Les informations administrateur servent uniquement a securiser l'acces a l'interface de gestion.",
            ],
          },
          {
            title: "Conservation",
            content: [
              "Les donnees de compte et de commande sont conservees fictivement pendant la duree necessaire au traitement commercial et comptable.",
              "Avant mise en production, cette duree devra etre precisee selon les obligations legales applicables.",
            ],
          },
          {
            title: "Droits des utilisateurs",
            content: [
              "Chaque client peut demander l'acces, la rectification ou la suppression de ses donnees en contactant BeautyPlace.",
              "Email fictif de contact RGPD : adelemanga75@gmail.com.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
