import { useState } from "react";

const YouTubeAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div>
      {isPlaying && (
        <iframe
          width="0"
          height="0"
          src="https://www.youtube.com/embed/kjlu9RRHcbE?autoplay=1&loop=1&playlist=kjlu9RRHcbE"
          allow="autoplay"
          style={{ display: "none" }}
        ></iframe>
      )}
      <button onClick={() => setIsPlaying(true)}>▶️ Jouer la musique</button>
    </div>
  );
};

export default YouTubeAudio;
