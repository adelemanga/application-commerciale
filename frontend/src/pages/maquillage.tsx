import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BeautyServicePage from "@/components/BeautyServicePage";
import client from "../graphql/client";

export default function MaquillagePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <BeautyServicePage
        eyebrow="Make up"
        title="Un maquillage lumineux et soigne"
        description="Une page dediee au maquillage, aux palettes, aux textures et aux produits qui aident a construire un look elegant."
        heroImage="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85"
        productsHref="/produits?categorie=maquillage"
        details={[
          "Produits teint, regard et finition presentes dans l'univers boutique.",
          "Selection adaptee aux looks doux, lumineux et professionnels.",
          "Ajoutez les produits au panier pour transmettre votre commande.",
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
