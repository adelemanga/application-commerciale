import { ApolloProvider } from "@apollo/client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BeautyServicePage from "@/components/BeautyServicePage";
import client from "../graphql/client";

export default function MassagePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <BeautyServicePage
        eyebrow="Massage"
        title="Un moment calme pour relacher les tensions"
        description="Un espace independant pour presenter l'ambiance massage, les soins detente et les produits de bien-etre qui accompagnent le rituel."
        heroImage="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85"
        productsHref="/produits?categorie=massage"
        details={[
          "Selection de soins orientes relaxation et confort.",
          "Produits douceur et rituels bien-etre accessibles depuis la boutique.",
          "Contactez l'institut pour une demande precise ou une question.",
        ]}
      />
      <Footer />
    </ApolloProvider>
  );
}
