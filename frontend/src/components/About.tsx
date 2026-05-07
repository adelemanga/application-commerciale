import Link from "next/link";

export default function AboutMe() {
  return (
    <div className="portfolio">
      <div className="wave wave-one"></div>
      <div className="wave wave-two"></div>
      <div className="wave wave-three"></div>

      {/* Card de présentation */}
      <div className="profile-card">
        {/* Image de profil avec cadre */}
        <div className="image-container">
          <div className="image-border">
            <img
              src="https://i.imgur.com/1LdqBMP.jpeg"
              alt="Votre Nom"
              width={180}
              height={180}
              className="profile-img"
            />
          </div>
        </div>

        {/* Texte de présentation */}
        <div className="text-content">
          <h1 className="title">
            Salut, moi c'est <span>Adèle Manga</span> 👋
          </h1>
          <p className="subtitle">
            Développeuse Web | Passionnée par la tech et l'UI/UX
          </p>

          {/* Boutons */}
          <div className="buttons">
            <Link href="/projects" className="btn">
              Voir Mes Projets
            </Link>
            <Link href="/contact" className="btn-outline">
              Me Contacter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
