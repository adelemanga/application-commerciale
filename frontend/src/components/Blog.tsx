function Blog() {
  return (
    <div className="list">
      <h2>Blog</h2>

      <main>
        <video
          className="video-background5"
          src="https://i.imgur.com/4pS6nCp.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
        />

        <article>
          <h2>Mon tout premier portfolio !</h2>
          <img
            className="img1Blog"
            src="https://i.imgur.com/DrcbKCv.png"
            alt="image2"
          />
          <p className="date">Publié le 30 octobre 2024</p>
          <p>
            Bienvenue sur mon tout premier portfolio ! 🎉 Ce projet représente
            bien plus qu’une simple vitrine de mes compétences : c’est le reflet
            de mon évolution en tant que développeur.J’ai conçu ce site avec,
            <b>React,</b> <b>Node.js,</b> <b>Javascript</b> et <b>CSS</b>, en
            mettant l’accent sur une interface moderne et dynamique. Vous y
            trouverez mes projets, mes expériences et les technologies que
            j’utilise au quotidien.
          </p>{" "}
        </article>
        <article>
          <h2>Découvrir une passion : Un site internet pour un ami</h2>
          <img
            className="img1Blog"
            src="https://i.imgur.com/7oLVQV8.png"
            alt="image"
          />
          <p className="date">Publié le 4 mars 2025</p>
          <p className="text-blog1">
            Mon ami est un passionné de football et souhaite partager son
            expertise avec d'autres passionnés. Afin de l'aider à réaliser son
            projet, j'ai développé un site web qui lui permet de proposer des
            cours de football personnalisés, destinés à des joueurs de tous
            niveaux. Ce site est conçu pour offrir une plateforme simple et
            efficace où les utilisateurs peuvent s'inscrire et réserver des
            sessions de coaching adaptées à leurs besoins. Que ce soit pour des
            entraînements individuels ou en groupe, le site met en avant les
            compétences de mon ami, ses méthodes d'entraînement, et ses conseils
            personnalisés. L'objectif est de rendre l'apprentissage du football
            accessible à tous, en offrant une expérience utilisateur fluide et
            agréable, tout en permettant à chaque joueur de progresser à son
            rythme.
          </p>
        </article>
      </main>
    </div>
  );
}

export default Blog;
