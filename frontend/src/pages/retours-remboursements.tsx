import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function RetoursRemboursementsPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Service client"
        title="Retours et remboursements"
        intro="Cette page precise les conditions fictives de retour, d'echange et de remboursement."
        sections={[
          {
            title: "Delai de retour",
            content: [
              "Le client dispose fictivement de 14 jours apres reception ou retrait pour demander un retour.",
              "Les produits ouverts, utilises, abimes ou non hygieniques peuvent etre refuses pour des raisons de securite et d'hygiene.",
            ],
          },
          {
            title: "Demande de retour",
            content: [
              "Le client doit contacter BeautyPlace par email avec son numero de commande, son nom et la raison du retour.",
              "Aucun retour ne doit etre renvoye sans accord prealable fictif de BeautyPlace.",
            ],
          },
          {
            title: "Remboursement",
            content: [
              "Apres verification du produit retourne, le remboursement fictif est effectue sur le moyen de paiement initial lorsque cela est possible.",
              "Pour les reservations payées sur place, le remboursement est traite directement avec le client selon les modalites convenues.",
            ],
          },
          {
            title: "Produits non remboursables",
            content: [
              "Les produits personnalises, ouverts, descelles ou presentant un risque hygienique peuvent ne pas etre repris.",
              "Cette liste devra etre adaptee aux produits reels vendus sur le site.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
