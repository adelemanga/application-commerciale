import { useState, useEffect } from "react";
import Link from "next/link";

const mainLinks = [
  { href: "/", label: "Accueil" },
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
            <Link href="/panier">Panier</Link>
            <Link href="/connexion-client">Inscription</Link>
            <Link href="/admin">Admin</Link>
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
                  <Link href="/panier" onClick={() => setIsOpen(false)}>
                    Panier
                  </Link>
                </li>
                <li>
                  <Link href="/connexion-client" onClick={() => setIsOpen(false)}>
                    Connexion / inscription
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
