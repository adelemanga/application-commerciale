import { ApolloProvider } from "@apollo/client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";

function PaiementSurPlaceContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/paiement-carte");
  }, [router]);

  return (
    <main className="shop-page cart-page">
      <section className="empty-cart-panel">
        <h2>Paiement par carte obligatoire</h2>
        <p>
          Les commandes sont maintenant payees par carte bancaire. Vous pourrez
          choisir livraison a domicile, point relais ou retrait magasin avant
          Stripe.
        </p>
        <Link href="/paiement-carte">Choisir livraison et payer</Link>
      </section>
    </main>
  );
}

export default function PaiementSurPlacePage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <PaiementSurPlaceContent />
      <Footer />
    </ApolloProvider>
  );
}
