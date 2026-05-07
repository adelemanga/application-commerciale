import { ApolloProvider } from "@apollo/client";
import client from "../graphql/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Projects from "../components/Project";

export default function ProjectPage() {
  return (
    <ApolloProvider client={client}>
      <div>
        <Header />
        <Projects />
        <Footer />
      </div>
    </ApolloProvider>
  );
}
