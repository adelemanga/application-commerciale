import { ApolloProvider } from "@apollo/client";
import client from "../graphql/client";
import Header from "@/components/Header";
import Blog from "@/components/Blog";
import Footer from "@/components/Footer";

export default function BlogPage() {
  return (
    <ApolloProvider client={client}>
      <div>
        <Header />
        <h1>Bienvenue dans mon Blog !</h1>
        <Blog />
        <Footer/>
      </div>
    </ApolloProvider>
  );
}
