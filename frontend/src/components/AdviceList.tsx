import { useQuery } from "@apollo/client";
import { GET_ALL_ADVICES } from "../graphql/queries";

function AdviceList() {
  const { loading, error, data } = useQuery(GET_ALL_ADVICES);

  console.log("Données reçues :", data);
  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error.message}</p>;

  if (!data || !data.getAllAvis || data.getAllAvis.length === 0) {
    return <p>Aucun avis pour le moment.</p>;
  }

  return (
    <div className="avis">
      <h1>Avis des utilisateurs</h1>

      {data.getAllAvis.map((advice: any) => (
        <div key={advice.id} className="advice-card">
          <img
            className="advice-avatar"
            src={advice.imgUrl}
            alt={`${advice.name} ${advice.lastname}`}
          />
          <h3>{advice.title}</h3>

          <p>
            <strong>
              {advice.name} {advice.lastname}
            </strong>
          </p>
          <p>Note : {"⭐".repeat(advice.rating)}</p>

          <p>{advice.message}</p>
        </div>
      ))}
    </div>
  );
}

export default AdviceList;
