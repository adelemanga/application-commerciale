import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function PolitiqueCookiesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Cookies"
        title="Politique cookies"
        intro="Cette politique de cookies est provisoire et devra etre adaptee si des outils de suivi sont ajoutes."
        sections={[
          {
            title: "Cookies essentiels",
            content: [
              "Le site peut utiliser des cookies techniques necessaires a la connexion, au panier et au fonctionnement de l'espace client.",
              "Ces cookies sont indispensables au service demande par l'utilisateur.",
            ],
          },
          {
            title: "Mesure d'audience",
            content: [
              "Aucun outil de mesure d'audience fictif n'est configure dans cette version.",
              "Si Google Analytics, Meta Pixel ou un outil similaire est ajoute, une bannière de consentement devra etre mise en place.",
            ],
          },
          {
            title: "Paiement Stripe",
            content: [
              "Stripe peut utiliser ses propres technologies de securite et de prevention de fraude lorsque le client accede a la page de paiement.",
              "Les donnees bancaires sont gerees par Stripe et non par BeautyPlace.",
            ],
          },
          {
            title: "Gestion du consentement",
            content: [
              "Avant la mise en production, le site devra proposer une solution claire pour accepter, refuser ou parametrer les cookies non essentiels.",
              "Cette page devra etre mise a jour selon les outils reels ajoutes au site.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
