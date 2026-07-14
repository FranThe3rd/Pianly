import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SongPicker from "../../components/SongPicker/SongPicker";
import LandscapeGate from "../../components/LandscapeGate/LandscapeGate";
import { saveSelection } from "../../data/songCatalog";

export default function Songs() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleConfirm = (difficulty, song) => {
    saveSelection(difficulty, song.id);

    if (isAuthenticated) {
      navigate("/playground", { state: { autoPlay: true } });
      return;
    }

    navigate("/login", { state: { from: "/playground" } });
  };

  return (
    <LandscapeGate>
      <SongPicker onConfirm={handleConfirm} />
    </LandscapeGate>
  );
}
