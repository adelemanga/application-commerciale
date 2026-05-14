import Link from "next/link";
import { useEffect, useRef } from "react";

const services = [
  {
    title: "Manucure",
    href: "/produits?categorie=manucure",
    pageHref: "/manucure",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Massage",
    href: "/produits?categorie=massage",
    pageHref: "/massage",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Make up",
    href: "/produits?categorie=maquillage",
    pageHref: "/maquillage",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Soins capillaires",
    href: "/produits?categorie=capillaires",
    pageHref: "/soins-capillaires",
    image:
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
  },
];

export default function HomePage() {
  const servicesSliderRef = useRef<HTMLElement | null>(null);
  const isSliderPausedRef = useRef(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const slider = servicesSliderRef.current;

      if (!slider || isSliderPausedRef.current) return;

      const firstCard = slider.querySelector<HTMLElement>(
        ".beauty-service-card"
      );
      const sliderStyles = window.getComputedStyle(slider);
      const sliderGap =
        Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap) || 24;
      const step = (firstCard?.offsetWidth || 262) + sliderGap;
      const halfWidth = slider.scrollWidth / 2;
      const nextScroll = slider.scrollLeft + step;

      slider.scrollTo({
        left: nextScroll >= halfWidth ? 0 : nextScroll,
        behavior: "smooth",
      });
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="beauty-home">
      <section className="beauty-hero">
        <div className="beauty-hero-copy">
          <p className="beauty-eyebrow">Beauty Place</p>
          <h1>Un univers beaute doux, moderne et elegant</h1>
          <p>
            Retrouvez vos soins, produits et prestations dans une experience
            claire, feminine et soignee, pensee pour reserver ou commander en
            toute simplicite.
          </p>
          <div className="beauty-actions">
            <Link href="/produits">Voir la boutique</Link>
            <Link href="/connexion-client">Espace client</Link>
            <Link href="/customer-advice">Avis clients</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="beauty-hero-media" aria-label="Salon de beaute">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=85"
            alt="Interieur lumineux d'un salon de beaute"
          />
        </div>
      </section>

      <section className="beauty-intro">
        <div>
          <p className="beauty-eyebrow">Notre approche</p>
          <h2>Des soins adaptes a chaque moment</h2>
        </div>
        <p>
          Une selection de prestations pour prendre soin de vous : ongles,
          visage, cheveux, maquillage et instants detente dans une ambiance
          lumineuse et raffinee.
        </p>
      </section>

      <section
        className="beauty-services"
        aria-label="Services beaute"
        ref={servicesSliderRef}
        onMouseEnter={() => {
          isSliderPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isSliderPausedRef.current = false;
        }}
        onFocus={() => {
          isSliderPausedRef.current = true;
        }}
        onBlur={() => {
          isSliderPausedRef.current = false;
        }}
      >
        {[...services, ...services].map((service, index) => {
          const isDuplicate = index >= services.length;

          return (
            <article
              aria-hidden={isDuplicate}
              className="beauty-service-card"
              key={`${service.title}-${index}`}
            >
              <Link
                className="beauty-service-image-link"
                href={service.pageHref}
                tabIndex={isDuplicate ? -1 : 0}
              >
                <img src={service.image} alt={service.title} />
              </Link>
              <Link href={service.href} tabIndex={isDuplicate ? -1 : 0}>
                {service.title}
              </Link>
            </article>
          );
        })}
      </section>

      <section className="beauty-story">
        <div className="beauty-story-text">
          <p className="beauty-eyebrow">Votre rituel</p>
          <h2>Revelez votre beaute naturelle</h2>
          <p>
            Chaque service est pense comme un moment de bien-etre, avec des
            produits choisis, des gestes precis et une presentation elegante
            pour vous guider facilement.
          </p>
        </div>
        <div className="beauty-story-gallery">
          <img
            src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80"
            alt="Soin visage"
          />
          <img
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80"
            alt="Maquillage professionnel"
          />
        </div>
      </section>
    </main>
  );
}
