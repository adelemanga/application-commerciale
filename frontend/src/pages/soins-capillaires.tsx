import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BeautyServicePage from "@/components/BeautyServicePage";
import client from "../graphql/client";

export default function SoinsCapillairesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <BeautyServicePage
        eyebrow="Soins capillaires"
        title="Des cheveux nourris, brillants et souples"
        description="Un espace pour les soins cheveux, les huiles, les gestes nourrissants et les produits capillaires disponibles a la vente."
        heroImage="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=85"
        productsHref="/produits?categorie=capillaires"
        details={[
          "Produits capillaires pour brillance, nutrition et douceur.",
          "Selection adaptee aux routines simples et efficaces.",
          "Commande possible depuis la boutique avec suivi cote administrateur.",
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
