import SongPicker from "../../components/SongPicker/SongPicker";

export default function SongSetup({ onConfirm }) {
  return <SongPicker onConfirm={onConfirm} showHeader={false} />;
}
