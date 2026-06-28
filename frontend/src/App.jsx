import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from "./pages/Home/Home.jsx"
import Playground from "./pages/Playground/Playground.jsx"

function App() {

  return (
<BrowserRouter>
      <Routes>
        <Route path="/" element={<Playground />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
