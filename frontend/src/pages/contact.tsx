import { ApolloProvider } from "@apollo/client";
import client from "../graphql/client";
import Header from "@/components/Header";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function ContactPage() {
  return (
    <ApolloProvider client={client}>
      <div>
        <Header />
        <Contact />
        <Footer />
      </div>
    </ApolloProvider>
  );
}
