import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BeautyServicePage from "@/components/BeautyServicePage";
import client from "../graphql/client";

export default function ManucurePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <BeautyServicePage
        eyebrow="Manucure"
        title="Des mains soignees et elegantes"
        description="Une page dediee aux soins des ongles, aux accessoires manucure et aux produits selectionnes pour une finition propre, douce et lumineuse."
        heroImage="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85"
        productsHref="/produits?categorie=manucure"
        details={[
          "Preparation des ongles et soin des cuticules.",
          "Produits et accessoires disponibles dans la boutique.",
          "Ajoutez vos produits au panier puis envoyez la commande a l'administrateur.",
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
