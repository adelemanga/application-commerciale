import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LegalPage from "@/components/LegalPage";
import client from "../graphql/client";

export default function MentionsLegalesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <LegalPage
        eyebrow="Informations legales"
        title="Mentions legales"
        intro="Cette page presente les informations principales de l'editeur du site BeautyPlace."
        sections={[
          {
            title: "Editeur du site",
            content: [
              "BeautyPlace est un exemple de boutique en ligne fictive exploitee par Adele Manga.",
              "Adresse fictive : 10 rue de la Beaute, 75000 Paris, France.",
              "Email de contact : adelemanga75@gmail.com.",
              "Numero SIRET fictif : 000 000 000 00000. Cette information devra etre remplacee par le vrai numero de l'entreprise.",
            ],
          },
          {
            title: "Responsable de publication",
            content: [
              "La responsable fictive de publication est Adele Manga.",
              "Cette mention devra etre remplacee par l'identite exacte du responsable legal avant toute publication commerciale.",
            ],
          },
          {
            title: "Hebergement",
            content: [
              "Hebergeur fictif : Beauty Hosting SAS, 1 avenue du Cloud, 75000 Paris.",
              "Cette section devra etre remplacee par les informations reelles de l'hebergeur choisi pour le frontend, le backend et la base de donnees.",
            ],
          },
          {
            title: "Propriete intellectuelle",
            content: [
              "Les textes, images, produits, logos et elements graphiques presents sur ce site sont utilises a titre fictif.",
              "Toute reproduction devra etre autorisee par le titulaire des droits concernes.",
            ],
          },
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
