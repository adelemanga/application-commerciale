import React from "react";
import { motion } from "framer-motion";

const projects = [
  {
    title: "Mon premier portfolio",
    img: "https://i.imgur.com/DrcbKCv.png",
    description:
      "Un portfolio interactif avec animations et transitions fluides.",
    link: "https://adelemanga-portfolio.netlify.app/",
    technologies: ["React", "Node.js", "CSS", "JavaScript", "GitHub"],
  },
  {
    title: "Amicale Sénior de Liebherr",
    img: "https://i.imgur.com/pZq4RUz.png",
    description: "Une app Worpress avec Laragon et Css customisé",
    link: "https://test.amicale-seniors-liebherr.net/",
    technologies: [
      "WordPress",
      "CSS",
      "Plugins",
      "Laragon",
      "FTP",
      "RapidDomaine",
    ],
  },
  {
    title: "Mon portfolio 2025",
    img: "https://i.imgur.com/i1xekKH.png",
    description: "Potfolio animé et fluide.",
    link: "#",
    technologies: [
      "React",
      "Node.js",
      "SQLite",
      "Next.js",
      "Apollo",
      "TypeORM",
      "TypeScript",
      "GitHub",
    ],
  },
  {
    title: "Aéroport de Colmar",
    img: "https://i.imgur.com/L6sUWRE.png",
    description: "Refonte du site de l'aéroport + Maquette",
    link: "https://adelemanga-portfolio.netlify.app/",
    technologies: ["WordPress", "CSS", "Plugins", "Laragon"],
  },
  {
    title: "Application de service de Football",
    img: "https://i.imgur.com/7oLVQV8.png",
    description: "Une app pour mon ami qui souhaite donner des cours.",
    link: "#",
    technologies: [
      "React",
      "Node.js",
      "SQLite",
      "Next.js",
      "Apollo",
      "TypeORM",
      "TypeScript",
      "GitHub",
    ],
  },
  {
    title: "Un restaurant à mon image",
    img: "https://i.imgur.com/ubNB7Fh.png",
    description:
      "Site e-commerce avec expérience utilisateur optimisée et paiement sécurisé.",
    link: "#",
    technologies: [
      "React",
      "Node.js",
      "SQLite",
      "Next.js",
      "Apollo",
      "TypeORM",
      "TypeScript",
      "GitHub",
    ],
  },
  {
    title: "Application Mobile React Native",
    img: "https://i.imgur.com/PjXDVgT.png",
    description:
      "Une app mobile avec React Native et Firebase pour le backend.",
    link: "#",
    technologies: [
      "GitHub",
      "Docker",
      "Apollo",
      "TypeORM",
      "TypeScript",
      "Tailwind CSS",
      "PostgreSQL",
      "Nginx",
      "TypeGraphQL",
    ],
  },
  {
    title: "Application pour administrer et visualiser les oeuvres d'arts",
    img: "https://i.imgur.com/SQdTHLH.png",
    description:
      "Application pour administrer et visualiser les oeuvres d'arts",
    link: "#",
    technologies: [
      "React",
      "Node.js",
      "GitHub",
      "JavaScript",
      "Postman",
      "MySQL",
      "JavaScript",
    ],
  },
];

function Projects() {
  const getTechIcons = (techList: string[]) => {
    const techIcons: { [key: string]: string } = {
      React: "⚛️React",
      "Node.js": "❇️Node.js",
      PostgreSQL: "🟪PostgreSQL",
      Docker: "🐳Docker",
      TypeGraphQL: "🔷TypeGraphQL",
      GitHub: "🐙GitHub",
      Nginx: "🖥️Nginx",
      "Next.js": "⏭️Next.js",
      Apollo: "🚀Apollo",
      "Tailwind CSS": "🌬️Tailwind CSS",
      SCSS: "🎨SCSS",
      CSS: "🎀CSS",
      SQLite: "💾SQLite",
      JavaScript: "🟨JavaScript",
      TypeScript: "🔵TypeScript",
      Postman: "🔵Postman",
      MySQL: "🐬MySQL",
      TypeORM: "📦TypeORM",
      Vite: "⚡Vite",
      WordPress: "📝WordPress",
      Plugins: "🧩Plugins",
      Laragon: "🧰Laragon",
      FTP: "📡FTP",
      RapidDomaine: "🌐RapidDomaine",
    };

    return techList.map((tech) => techIcons[tech] || "🔧").join(" ");
  };

  return (
    <div className="projects-container">
      <h2 className="projects-title">🚀 Mes Projets</h2>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <motion.div
            key={index}
            className="project-card"
            whileHover={{ scale: 1.05 }}
          >
            <img
              src={project.img}
              alt={project.title}
              className="project-img"
            />
            <div className="project-content">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.description}</p>

              {/* Affichage des technologies sous forme d'icônes */}
              <p className="project-technologies">
                <strong>Technologies utilisées:</strong>{" "}
                {getTechIcons(project.technologies)}
              </p>

              <a href={project.link} target="-blank" className="project-link">
                Voir le projet
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
