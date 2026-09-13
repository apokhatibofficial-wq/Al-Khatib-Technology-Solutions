// The actual illustrations from the design board (0808TAXI.pdf), cropped
// straight out of the source PDF at 400dpi — not redrawn — so what ships
// is the user's own artwork. Reused across screens (onboarding, the
// waiting timer, the driver profile fallback) via one shared component
// per graphic rather than repeating the <img> markup everywhere.
import taxiCar from "../assets/taxi-car.png";
import stopwatch from "../assets/stopwatch.png";
import driverCap from "../assets/driver-cap.png";

export function TaxiCarIcon({ size = 120 }: { size?: number }) {
  return <img src={taxiCar} alt="" width={size} style={{ width: size, height: "auto" }} />;
}

export function StopwatchIcon({ size = 120 }: { size?: number }) {
  return <img src={stopwatch} alt="" width={size} style={{ width: size, height: "auto" }} />;
}

export function DriverCapIcon({ size = 120 }: { size?: number }) {
  return <img src={driverCap} alt="" width={size} style={{ width: size, height: "auto" }} />;
}
