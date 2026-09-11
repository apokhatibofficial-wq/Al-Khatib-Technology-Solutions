import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Apply } from "./screens/Apply";
import { Pending } from "./screens/Pending";
import { Home } from "./screens/Home";
import { ActiveRide } from "./screens/ActiveRide";
import { driverMe, currentRide, type DriverMe, type DriverStatus } from "./api/driver";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, restoring } = useAuth();
  if (restoring) return null;
  if (!user) return <Navigate to="/splash" replace />;
  return <>{children}</>;
}

// Root decides between four real states, in order: logged out, no driver
// profile yet (-> Apply), profile not APPROVED yet (-> Pending), or a
// working driver (-> resume an in-progress ride if one exists, else Home).
// /me's embedded driver summary only has {status, isOnline} — the driver's
// own id (needed for the driver:{id} WS room) and any in-progress ride
// need their own fetches, done here once, before Home ever mounts.
function Root() {
  const { user, restoring, refreshMe } = useAuth();
  const [driver, setDriver] = useState<DriverMe | null>(null);
  const [rideId, setRideId] = useState<string | null>();

  useEffect(() => {
    if (!user?.driver || user.driver.status !== "APPROVED") return;
    void (async () => {
      const [d, ride] = await Promise.all([driverMe(), currentRide()]);
      setDriver(d);
      setRideId(ride?.id ?? null);
    })();
  }, [user]);

  if (restoring) return null;
  if (!user) return <Navigate to="/splash" replace />;
  if (!user.driver) return <Apply onApplied={() => void refreshMe()} />;
  if (user.driver.status !== "APPROVED") {
    return <Pending status={user.driver.status as Exclude<DriverStatus, "APPROVED">} />;
  }

  if (!driver || rideId === undefined) return null;
  if (rideId) return <Navigate to={`/ride/${rideId}`} replace />;
  return <Home driverId={driver.id} initialOnline={driver.isOnline} />;
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
            path="/ride/:id"
            element={
              <RequireAuth>
                <ActiveRide />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
