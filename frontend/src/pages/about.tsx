import { ApolloProvider } from "@apollo/client";
import client from "../graphql/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AboutMe from "@/components/About";

export default function Food() {
  return (
    <ApolloProvider client={client}>
      <div>
        <Header />
        <h1>A propos de moi !</h1>
        <AboutMe />
        <Footer />
      </div>
    </ApolloProvider>
  );
}
