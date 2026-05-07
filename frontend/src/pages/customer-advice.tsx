import { ApolloProvider } from "@apollo/client";
import client from "../graphql/client";
import Header from "@/components/Header";
import Advice from "@/components/Advice";
import Footer from "@/components/Footer";
import AdviceList from "@/components/AdviceList";

export default function AdvicePage() {
  return (
    <ApolloProvider client={client}>
      <div>
        <Header />
        <Advice />
        <AdviceList/>
        <Footer />
      </div>
    </ApolloProvider>
  );
}
