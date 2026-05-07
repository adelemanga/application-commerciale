import Link from "next/link";

type ServicePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  heroImage: string;
  details: string[];
  productsHref: string;
};

export default function BeautyServicePage({
  eyebrow,
  title,
  description,
  heroImage,
  details,
  productsHref,
}: ServicePageProps) {
  return (
    <main className="service-page">
      <section className="service-hero">
        <div className="service-copy">
          <p className="beauty-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="beauty-actions">
            <Link href={productsHref}>Voir les produits</Link>
            <Link href="/connexion-client">Espace client</Link>
          </div>
        </div>
        <img src={heroImage} alt={title} />
      </section>

      <section className="service-details">
        {details.map((detail) => (
          <article key={detail}>
            <span />
            <p>{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
