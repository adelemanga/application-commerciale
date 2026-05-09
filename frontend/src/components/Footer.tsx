import Link from "next/link";

function Footer() {
  return (
    <div>
      <footer>
        <div className="footer-main">
          <p>Auteur: Adèle Manga</p>
          <p>
            <a href="mailto:adelemanga75@gmail.com">adelemanga75@gmail.com</a>
          </p>
        </div>
        <nav className="footer-legal-links" aria-label="Liens legaux">
          <Link href="/mentions-legales">Mentions legales</Link>
          <Link href="/conditions-generales-de-vente">CGV</Link>
          <Link href="/politique-confidentialite">Confidentialite</Link>
          <Link href="/retours-remboursements">Retours</Link>
          <Link href="/livraison-retrait">Livraison et retrait</Link>
          <Link href="/politique-cookies">Cookies</Link>
        </nav>
      </footer>
    </div>
  );
}

export default Footer;
