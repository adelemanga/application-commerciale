type LegalSection = {
  title: string;
  content: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="shop-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <strong>Document provisoire fictif - a completer avant mise en ligne.</strong>
      </section>

      <section className="legal-content">
        {sections.map((section) => (
          <article className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.content.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
