import { createContext } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { gql, useQuery } from "@apollo/client";
import { Layout as AntLayout } from "antd";

const WHO_AM_I = gql`
  query WhoAmI {
    whoAmI {
      isLoggedIn
      email
      role
      firstname
      lastname
    }
  }
`;

export const UserContext = createContext({
  isLoggedIn: false,
  email: "",
  role: "",
  firstname: "",
  lastname: "",
  refetch: () => {},
});

function Layout({ children }: { children: React.ReactNode }) {
  const { data, refetch, loading, error } = useQuery(WHO_AM_I);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error</p>;

  return (
    <UserContext.Provider
      value={{
        isLoggedIn: data?.whoAmI?.isLoggedIn ?? false,
        email: data?.whoAmI?.email ?? "",
        role: data?.whoAmI?.role ?? "",
        firstname: data?.whoAmI?.firstname ?? "",
        lastname: data?.whoAmI?.lastname ?? "",
        refetch,
      }}
    >
      <AntLayout>
        <Navbar />
        <AntLayout.Content>
          {children}
        </AntLayout.Content>
        <div className="flex justify-center">
          <Footer />
        </div>
      </AntLayout>
    </UserContext.Provider>
  );
}

export default Layout;

// import { useState } from "react";

// const Layout = ({ children }: { children: React.ReactNode }) => {
//   const [isPlaying, setIsPlaying] = useState(false);

//   return (
//     <div>
//       <div className="music-container">
//         {isPlaying && (
//           <iframe
//             width="0"
//             height="0"
//             src="https://www.youtube.com/embed/kjlu9RRHcbE?autoplay=1&loop=1&playlist=kjlu9RRHcbE"
//             allow="autoplay"
//             style={{ display: "none" }}
//           ></iframe>
//         )}

//         <button
//           className="button-music"
//           onClick={() => setIsPlaying(!isPlaying)}
//         >
//           {isPlaying ? "⏸️ Stop Music" : "▶️ Jouer"}
//         </button>
//       </div>

//       {children}
//     </div>
//   );
// };

// export default Layout;
