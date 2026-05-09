import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function LivraisonRetraitPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Commande"
        title="Livraison et retrait"
        intro="Cette page explique les modes fictifs de livraison et de retrait proposes par BeautyPlace."
        sections={[
          {
            title: "Livraison",
            content: [
              "Les commandes payees en ligne par carte bancaire peuvent etre preparees puis expediees selon le transporteur choisi par l'administrateur.",
              "Le numero de suivi apparait dans l'espace client lorsque l'administrateur renseigne le transporteur et le suivi.",
            ],
          },
          {
            title: "Retrait sur place",
            content: [
              "Le client peut choisir un paiement sur place. Dans ce cas, aucun colis n'est envoye.",
              "Le client selectionne une date de retrait obligatoire et une heure optionnelle. Ces informations sont transmises a l'administrateur.",
            ],
          },
          {
            title: "Delais",
            content: [
              "Delai fictif de preparation : 24 a 72 heures ouvrables selon le stock et la disponibilite.",
              "Delai fictif de livraison : 2 a 5 jours ouvrables apres expedition.",
            ],
          },
          {
            title: "Adresse incomplete",
            content: [
              "Le client est responsable de l'exactitude de son adresse, de son numero de telephone et de ses informations de retrait.",
              "BeautyPlace peut contacter le client si une information est incomplete ou incoherente.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
