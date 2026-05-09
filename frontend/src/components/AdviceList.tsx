import { useQuery } from "@apollo/client";
import { GET_ALL_ADVICES } from "../graphql/queries";

function AdviceList() {
  const { loading, error, data } = useQuery(GET_ALL_ADVICES);

  console.log("Données reçues :", data);
  if (loading) return <p className="shop-message">Chargement des avis...</p>;
  if (error) return <p className="shop-message">Impossible de charger les avis.</p>;

  if (!data || !data.getAllAvis || data.getAllAvis.length === 0) {
    return (
      <section className="customer-advice-list-section">
        <h1>Avis des utilisateurs</h1>
        <p>Aucun avis pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="customer-advice-list-section">
      <h1>Avis des utilisateurs</h1>

      <div className="customer-advice-grid">
        {data.getAllAvis.map((advice: any) => (
          <article key={advice.id} className="advice-card">
            <img
              className="advice-avatar"
              src={advice.imgUrl}
              alt={`${advice.name} ${advice.lastname}`}
            />
            <h3>{advice.title}</h3>

            <p className="name">
              {advice.name} {advice.lastname}
            </p>
            <p className="rating">{"⭐".repeat(advice.rating)}</p>

            <p>{advice.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdviceList;
