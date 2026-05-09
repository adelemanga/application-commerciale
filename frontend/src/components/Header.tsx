import { useState, useEffect } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LOGOUT, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";

const mainLinks = [
  { href: "/", label: "Accueil" },
  { href: "/about", label: "Presentation" },
  { href: "/projects", label: "Projets" },
  { href: "/produits", label: "Boutique" },
  { href: "/customer-advice", label: "Avis" },
  { href: "/contact", label: "Contact" },
];

const serviceLinks = [
  { href: "/produits?categorie=manucure", label: "Manucure" },
  { href: "/produits?categorie=massage", label: "Massage" },
  { href: "/produits?categorie=maquillage", label: "Make up" },
  { href: "/produits?categorie=capillaires", label: "Cheveux" },
];

export default function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { data, refetch } = useQuery(WHO_AM_I, {
    fetchPolicy: "cache-and-network",
  });
  const [logout] = useLazyQuery(LOGOUT, {
    fetchPolicy: "network-only",
  });
  const user = data?.whoAmI;
  const isLoggedIn = Boolean(user?.isLoggedIn);
  const isClientLoggedIn = isLoggedIn && user?.role === Role.User;
  const isAdminLoggedIn = isLoggedIn && user?.role === Role.Admin;
  const clientName = [user?.firstname, user?.lastname].filter(Boolean).join(" ");
  const clientLabel = clientName || user?.email || "Mon compte client";
  const profileImage =
    user?.avatarUrl ||
    "https://img.freepik.com/premium-vector/default-avatar-profile-icon-vector-social-media-user-image_543062-212.jpg";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsOpen(false); // Ferme le menu si on agrandit l'écran
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    await refetch();
    setIsOpen(false);
    router.push("/");
  };

  return (
    <header className="navbar">
      {/* Menu Desktop */}
      {!isMobile && (
        <nav className="nav0">
          <Link className="nav-brand" href="/">
            Beauty Place
          </Link>
          <div className="nav-links">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-links nav-services" aria-label="Services beaute">
            {serviceLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            <Link className="cart-icon-link" href="/panier" aria-label="Panier">
              <ShoppingBag aria-hidden="true" size={19} strokeWidth={2.2} />
              <span>Panier</span>
            </Link>
            {isClientLoggedIn ? (
              <Link className="nav-user-link" href="/clients">
                <span>Bonjour {clientLabel}</span>
                <img src={profileImage} alt="" aria-hidden="true" />
              </Link>
            ) : !isLoggedIn ? (
              <Link href="/connexion-client">Inscription</Link>
            ) : null}
            <Link href={isAdminLoggedIn ? "/admin" : "/connexion-administrateur"}>
              {isAdminLoggedIn ? "Interface admin" : "Admin"}
            </Link>
            {isClientLoggedIn && <Link href="/suivi-commandes">Suivi</Link>}
            {isLoggedIn && (
              <Link href="/" onClick={handleLogout}>
                Deconnexion
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Drawer Mobile */}
      {isMobile && (
        <>
          <button className="drawer-button" onClick={() => setIsOpen(true)}>
            ☰
          </button>

          {isOpen && (
            <div className="overlay" onClick={() => setIsOpen(false)}></div>
          )}

          <div className={`drawer ${isOpen ? "open" : ""}`}>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
            <nav>
              <p className="drawer-title">Beauty Place</p>
              <ul>
                {mainLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setIsOpen(false)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="drawer-section">Services</p>
              <ul>
                {serviceLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setIsOpen(false)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="drawer-section">Comptes</p>
              <ul>
                <li>
                  <Link
                    className="drawer-cart-link"
                    href="/panier"
                    aria-label="Panier"
                    onClick={() => setIsOpen(false)}
                  >
                    <ShoppingBag aria-hidden="true" size={20} strokeWidth={2.2} />
                    <span>Panier</span>
                  </Link>
                </li>
                <li>
                  {isClientLoggedIn ? (
                    <Link
                      className="drawer-user-link"
                      href="/clients"
                      onClick={() => setIsOpen(false)}
                    >
                      <span>Bonjour {clientLabel}</span>
                      <img src={profileImage} alt="" aria-hidden="true" />
                    </Link>
                  ) : !isLoggedIn ? (
                    <Link
                      href="/connexion-client"
                      onClick={() => setIsOpen(false)}
                    >
                      Connexion / inscription
                    </Link>
                  ) : null}
                </li>
                <li>
                  <Link
                    href={isAdminLoggedIn ? "/admin" : "/connexion-administrateur"}
                    onClick={() => setIsOpen(false)}
                  >
                    {isAdminLoggedIn ? "Interface admin" : "Admin"}
                  </Link>
                </li>
                {isClientLoggedIn && (
                  <li>
                    <Link
                      href="/suivi-commandes"
                      onClick={() => setIsOpen(false)}
                    >
                      Suivi commandes
                    </Link>
                  </li>
                )}
                {isLoggedIn && (
                  <li>
                    <Link href="/" onClick={handleLogout}>
                      Deconnexion
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
