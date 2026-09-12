import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Home } from "./screens/Home";
import { RequestRide } from "./screens/RequestRide";
import { Profile } from "./screens/Profile";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, restoring } = useAuth();
  if (restoring) return null;
  if (!user) return <Navigate to="/splash" replace />;
  return <>{children}</>;
}

function Root() {
  const { user, restoring } = useAuth();
  if (restoring) return null;
  return user ? <Home /> : <Navigate to="/splash" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Root />} />
          <Route
            path="/request"
            element={
              <RequireAuth>
                <RequestRide />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
