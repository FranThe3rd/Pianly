import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { LenisProvider } from "./context/LenisContext";
import LandingNav from "./components/LandingNav/LandingNav";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Login/Login.jsx";
import Register from "./pages/Register/Register.jsx";
import Songs from "./pages/Songs/Songs.jsx";
import Playground from "./pages/Playground/Playground.jsx";
import Pricing from "./pages/Pricing/Pricing.jsx";
import PricingReturn from "./pages/Pricing/PricingReturn.jsx";

const IMMERSIVE_PATHS = ["/songs", "/playground"];

function AppRoutes() {
  const { pathname } = useLocation();
  const isImmersive = IMMERSIVE_PATHS.some((path) => pathname.startsWith(path));

  return (
    <div className={isImmersive ? "app-immersive" : undefined}>
      <LandingNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/pricing/return" element={<PricingReturn />} />
        <Route
          path="/playground"
          element={
            <ProtectedRoute>
              <Playground />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BrowserRouter>
          <LenisProvider>
            <AppRoutes />
          </LenisProvider>
        </BrowserRouter>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
