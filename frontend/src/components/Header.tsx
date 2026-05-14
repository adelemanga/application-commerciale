import { useState, useEffect } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  GET_ALL_PLATFORM_CLIENT_MESSAGES,
  GET_MY_CLIENT_MESSAGES,
  LOGOUT,
  WHO_AM_I,
} from "../graphql/queries";
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

const RESPONSIVE_MENU_BREAKPOINT = 1024;

export default function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissedAdminMessageSignature, setDismissedAdminMessageSignature] =
    useState("");
  const [dismissedClientMessageSignature, setDismissedClientMessageSignature] =
    useState("");
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
  const { data: clientMessagesData } = useQuery(GET_MY_CLIENT_MESSAGES, {
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
    skip: !isClientLoggedIn,
  });
  const { data: adminMessagesData } = useQuery(
    GET_ALL_PLATFORM_CLIENT_MESSAGES,
    {
      fetchPolicy: "cache-and-network",
      pollInterval: 15000,
      skip: !isAdminLoggedIn,
    }
  );
  const clientUnreadAdminMessages =
    clientMessagesData?.getMyClientMessages?.filter(
      (clientMessage: any) =>
        clientMessage.senderRole === "Admin" && !clientMessage.readAt
    ) ?? [];
  const clientMessageCount = clientUnreadAdminMessages.length;
  const clientUnreadMessageSignature = clientUnreadAdminMessages
    .map((clientMessage: any) => clientMessage.id)
    .sort()
    .join("-");
  const showClientMessagePopup =
    isClientLoggedIn &&
    clientMessageCount > 0 &&
    dismissedClientMessageSignature !== clientUnreadMessageSignature;
  const adminUnreadClientMessages =
    adminMessagesData?.getAllPlatformClientMessages?.filter(
      (platformMessage: any) =>
        platformMessage.senderRole === "Client" && !platformMessage.readAt
    ) ?? [];
  const adminUnreadClientMessageCount = adminUnreadClientMessages.length;
  const adminUnreadMessageSignature = adminUnreadClientMessages
    .map((platformMessage: any) => platformMessage.id)
    .sort()
    .join("-");
  const showAdminMessagePopup =
    isAdminLoggedIn &&
    adminUnreadClientMessageCount > 0 &&
    dismissedAdminMessageSignature !== adminUnreadMessageSignature;
  const clientName = [user?.firstname, user?.lastname]
    .filter(Boolean)
    .join(" ");
  const clientLabel = clientName || user?.email || "Mon compte client";
  const visibleMainLinks = isAdminLoggedIn
    ? mainLinks.filter((link) => link.href !== "/contact")
    : mainLinks;
  const profileImage =
    user?.avatarUrl ||
    "https://img.freepik.com/premium-vector/default-avatar-profile-icon-vector-social-media-user-image_543062-212.jpg";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= RESPONSIVE_MENU_BREAKPOINT);
      if (window.innerWidth > RESPONSIVE_MENU_BREAKPOINT) {
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

  const prefetchRoute = (href: string) => {
    router.prefetch(href).catch(() => undefined);
  };

  const rememberClientMessageOpen = () => {
    window.sessionStorage.setItem("mark-client-messages-read", "1");
  };

  return (
    <header className="navbar">
      {showAdminMessagePopup && (
        <div className="admin-message-popup" role="status">
          <div>
            <strong>
              {adminUnreadClientMessageCount} message(s) client non lu(s)
            </strong>
            <span>
              Ouvrez la messagerie pour traiter les nouveaux messages.
            </span>
          </div>
          <Link href="/admin-messages">Voir</Link>
          <button
            type="button"
            aria-label="Fermer l'alerte messages"
            onClick={() =>
              setDismissedAdminMessageSignature(adminUnreadMessageSignature)
            }
          >
            ×
          </button>
        </div>
      )}
      {showClientMessagePopup && (
        <div className="admin-message-popup client-message-popup" role="status">
          <div>
            <strong>{clientMessageCount} message(s) BeautyPlace non lu(s)</strong>
            <span>
              Une mise a jour de commande ou un message BeautyPlace vous attend.
            </span>
          </div>
          <Link href="/messages-client" onClick={rememberClientMessageOpen}>
            Voir
          </Link>
          <button
            type="button"
            aria-label="Fermer l'alerte messages BeautyPlace"
            onClick={() =>
              setDismissedClientMessageSignature(clientUnreadMessageSignature)
            }
          >
            ×
          </button>
        </div>
      )}
      {/* Menu Desktop */}
      {!isMobile && (
        <nav className="nav0">
          <Link className="nav-brand" href="/">
            Beauty Place
          </Link>
          <div className="nav-links">
            {visibleMainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => prefetchRoute(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-links nav-services" aria-label="Services beaute">
            {serviceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => prefetchRoute(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            {!isAdminLoggedIn && (
              <Link
                className="cart-icon-link"
                href="/panier"
                aria-label="Panier"
                onMouseEnter={() => prefetchRoute("/panier")}
              >
                <ShoppingBag aria-hidden="true" size={19} strokeWidth={2.2} />
                <span>Panier</span>
              </Link>
            )}
            {isClientLoggedIn ? (
              <Link className="nav-user-link" href="/clients">
                <span>Bonjour {clientLabel}</span>
                <img src={profileImage} alt="" aria-hidden="true" />
              </Link>
            ) : !isLoggedIn ? (
              <>
                <Link href="/connexion-client">Connexion </Link>
                <Link href="/inscription-client">Inscription </Link>
              </>
            ) : null}
            {!isClientLoggedIn && (
              <Link
                href={isAdminLoggedIn ? "/admin" : "/connexion-administrateur"}
              >
                {isAdminLoggedIn ? "Interface admin" : "Admin"}
              </Link>
            )}
            {isAdminLoggedIn && (
              <Link
                className="nav-message-link nav-admin-message-link"
                href="/admin-messages"
              >
                Messages
                {adminUnreadClientMessageCount > 0 && (
                  <span className="message-alert-badge">
                    {adminUnreadClientMessageCount}
                  </span>
                )}
              </Link>
            )}
            {isClientLoggedIn && (
              <Link
                className="nav-message-link"
                href="/messages-client"
                onClick={rememberClientMessageOpen}
              >
                Messages
                {clientMessageCount > 0 && (
                  <span className="message-alert-badge">
                    {clientMessageCount}
                  </span>
                )}
              </Link>
            )}
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
                {visibleMainLinks.map((link) => (
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
                {!isAdminLoggedIn && (
                  <li>
                    <Link
                      className="drawer-cart-link"
                      href="/panier"
                      aria-label="Panier"
                      onClick={() => setIsOpen(false)}
                    >
                      <ShoppingBag
                        aria-hidden="true"
                        size={20}
                        strokeWidth={2.2}
                      />
                      <span>Panier</span>
                    </Link>
                  </li>
                )}
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
                    <>
                      <Link
                        href="/connexion-client"
                        onClick={() => setIsOpen(false)}
                      >
                        Connexion
                      </Link>
                      <Link
                        href="/inscription-client"
                        onClick={() => setIsOpen(false)}
                      >
                        Inscription
                      </Link>
                    </>
                  ) : null}
                </li>
                {!isClientLoggedIn && (
                  <li>
                    <Link
                      href={
                        isAdminLoggedIn ? "/admin" : "/connexion-administrateur"
                      }
                      onClick={() => setIsOpen(false)}
                    >
                      {isAdminLoggedIn ? "Interface admin" : "Admin"}
                    </Link>
                  </li>
                )}
                {isAdminLoggedIn && (
                  <li>
                    <Link
                      className="drawer-message-link"
                      href="/admin-messages"
                      onClick={() => setIsOpen(false)}
                    >
                      Messages
                      {adminUnreadClientMessageCount > 0 && (
                        <span className="message-alert-badge">
                          {adminUnreadClientMessageCount}
                        </span>
                      )}
                    </Link>
                  </li>
                )}
                {isClientLoggedIn && (
                  <li>
                    <Link
                      className="drawer-message-link"
                      href="/messages-client"
                      onClick={() => {
                        rememberClientMessageOpen();
                        setIsOpen(false);
                      }}
                    >
                      Messages
                      {clientMessageCount > 0 && (
                        <span className="message-alert-badge">
                          {clientMessageCount}
                        </span>
                      )}
                    </Link>
                  </li>
                )}
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
