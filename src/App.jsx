import { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

import L from "leaflet";
const pickupIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const dropIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684809.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});




// Custom car icon
const carIcon = new L.Icon({
  iconUrl: "/image/car.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const riderIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function App() {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [route, setRoute] = useState(null);
  const [fare, setFare] = useState(null);
  const [distance, setDistance] = useState(null);
  const [poolFare, setPoolFare] = useState(null);
  const [showPool, setShowPool] = useState(false);
  const [driver, setDriver] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [eta, setEta] = useState(null);
  const [rideType, setRideType] = useState("solo");
  const [rideStatus, setRideStatus] = useState("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [secondRider, setSecondRider] = useState(null);
  const [poolAccepted, setPoolAccepted] = useState(false);
  const [segments, setSegments] = useState([]);

  const handleAcceptPool = async () => {

    if (!secondRider) return;

    const multiRouteResponse = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${route[0][1]},${route[0][0]};${secondRider.pickupCoords[1]},${secondRider.pickupCoords[0]};${secondRider.dropCoords[1]},${secondRider.dropCoords[0]};${route[route.length - 1][1]},${route[route.length - 1][0]}?overview=full&geometries=geojson`
    ).then(res => res.json());

    const multiRouteData = multiRouteResponse.routes[0];

    const multiRouteCoordinates = multiRouteData.geometry.coordinates.map(coord => [
      coord[1],
      coord[0],
    ]);

    const totalPoints = multiRouteCoordinates.length;

    const segment1 = multiRouteCoordinates.slice(0, Math.floor(totalPoints / 3));
    const segment2 = multiRouteCoordinates.slice(
      Math.floor(totalPoints / 3),
      Math.floor((2 * totalPoints) / 3)
    );
    const segment3 = multiRouteCoordinates.slice(
      Math.floor((2 * totalPoints) / 3)
    );

    setSegments([
      { points: segment1, color: "blue" },
      { points: segment2, color: "orange" },
      { points: segment3, color: "green" }
    ]);

    setRoute(multiRouteCoordinates);
    setFare(poolFare);
    setPoolAccepted(true);
    setShowPool(false);
  };

  const handleRideRequest = async () => {
    if (!pickup || !drop) {
      alert("Enter pickup and drop");
      return;
    }

    setIsLoading(true);
    setRideStatus("searching");

    try {
      // ----------------------------
      // 1️⃣ Geocode pickup & drop
      // ----------------------------
      const geoPickup = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${pickup}`
      ).then(res => res.json());

      const geoDrop = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${drop}`
      ).then(res => res.json());

      if (geoPickup.length === 0 || geoDrop.length === 0) {
        alert("Location not found");
        setIsLoading(false);
        return;
      }

      const pickupCoords = [
        parseFloat(geoPickup[0].lat),
        parseFloat(geoPickup[0].lon),
      ];

      const dropCoords = [
        parseFloat(geoDrop[0].lat),
        parseFloat(geoDrop[0].lon),
      ];

      // ----------------------------
      // 2️⃣ Get main route
      // ----------------------------
      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickupCoords[1]},${pickupCoords[0]};${dropCoords[1]},${dropCoords[0]}?overview=full&geometries=geojson`
      ).then(res => res.json());

      if (!routeResponse.routes || routeResponse.routes.length === 0) {
        alert("Route not found");
        setIsLoading(false);
        return;
      }

      const routeData = routeResponse.routes[0];

      const routeCoordinates = routeData.geometry.coordinates.map(coord => [
        coord[1],
        coord[0],
      ]);

      const distanceKm = routeData.distance / 1000;
      const baseFare = 50;
      const perKmRate = 12;
      const totalFare = Math.round(baseFare + distanceKm * perKmRate);

      let finalRouteCoordinates = routeCoordinates;

      // ----------------------------
      // 3️⃣ Pool logic
      // ----------------------------
      if (rideType === "pool") {

        const rider2PickupCoords = [28.5550, 77.2100];
        const rider2DropCoords = [28.5700, 77.2300];

        // Get rider 2 route distance
        const rider2RouteResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${rider2PickupCoords[1]},${rider2PickupCoords[0]};${rider2DropCoords[1]},${rider2DropCoords[0]}?overview=false`
        ).then(res => res.json());

        const rider2DistanceKm = rider2RouteResponse.routes[0].distance / 1000;

        const rider1Fare = Math.round(totalFare * 0.85);

        const rider2Fare = Math.round(
          (50 + rider2DistanceKm * 12) * 0.85
        );

        setPoolFare(rider1Fare);
        setShowPool(true);

        setSecondRider({
          name: "Rohit Mehta",
          rating: 4.5,
          pickup: "Green Park, Delhi",
          drop: "Lajpat Nagar, Delhi",
          pickupCoords: rider2PickupCoords,
          dropCoords: rider2DropCoords,
          fare: rider2Fare
        });

      } else {
        setSegments([{ points: routeCoordinates, color: "blue" }]);
      }

      // ----------------------------
      // 4️⃣ Set main route
      // ----------------------------
      setRoute(routeCoordinates);
      setFare(totalFare);
      setDistance(distanceKm.toFixed(2));

      // ----------------------------
      // 5️⃣ Simulate driver
      // ----------------------------
      const randomOffsetLat = (Math.random() - 0.5) * 0.02;
      const randomOffsetLng = (Math.random() - 0.5) * 0.02;

      const driverStart = [
        pickupCoords[0] + randomOffsetLat,
        pickupCoords[1] + randomOffsetLng
      ];

      const driverRouteResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${driverStart[1]},${driverStart[0]};${pickupCoords[1]},${pickupCoords[0]}?overview=full&geometries=geojson`
      ).then(res => res.json());

      const driverRouteData = driverRouteResponse.routes[0];

      const driverPath = driverRouteData.geometry.coordinates.map(coord => [
        coord[1],
        coord[0],
      ]);

      const closestDriver = {
        name: "Sanjay Kumar",
        rating: 4.9,
        location: driverStart
      };

      setDriver(closestDriver);
      setDriverPosition(driverStart);

      const estimatedTime = Math.floor(Math.random() * 6) + 3;
      setEta(estimatedTime);
      setRideStatus("assigned");

      // ----------------------------
      // 6️⃣ Smooth animation
      // ----------------------------
      let currentIndex = 0;
      let progress = 0;

      const interval = setInterval(() => {
        if (currentIndex >= driverPath.length - 1) {
          clearInterval(interval);
          setDriverPosition(driverPath[driverPath.length - 1]);
          setEta(0);
          setRideStatus("arrived");
          return;
        }

        const start = driverPath[currentIndex];
        const end = driverPath[currentIndex + 1];

        const lat = start[0] + (end[0] - start[0]) * progress;
        const lng = start[1] + (end[1] - start[1]) * progress;

        setDriverPosition([lat, lng]);

        progress += 0.05; // smoother & slower

        if (progress >= 1) {
          progress = 0;
          currentIndex++;
        }

        setEta(prev => {
          const updated = prev - (estimatedTime / (driverPath.length * 20));
          return Math.max(0, parseFloat(updated.toFixed(1)));
        });

      }, 200);

    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }

    setIsLoading(false);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>RideNow 🚗</h1>

        <input
          type="text"
          placeholder="Pickup Location"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
        />

        <input
          type="text"
          placeholder="Drop Location"
          value={drop}
          onChange={(e) => setDrop(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={() => setRideType("solo")}
            style={{
              flex: 1,
              background: rideType === "solo" ? "#1db954" : "#333",
              color: "white",
              padding: "8px",
              borderRadius: "8px",
              border: "none"
            }}
          >
            Solo
          </button>

          <button
            onClick={() => setRideType("pool")}
            style={{
              flex: 1,
              background: rideType === "pool" ? "#1db954" : "#333",
              color: "white",
              padding: "8px",
              borderRadius: "8px",
              border: "none"
            }}
          >
            Pool
          </button>
        </div>

        <button onClick={handleRideRequest} disabled={isLoading}>
          {isLoading ? "Searching..." : "Request Ride"}
        </button>

        {isLoading && (
          <div className="loading-overlay">
            <div className="loader"></div>
            <p>Finding nearby drivers...</p>
          </div>
        )}

        {route && (
          <MapContainer
            center={route[0]}
            zoom={13}
            style={{ height: "300px", marginTop: "20px" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Pickup */}
            <Marker position={route[0]} icon={pickupIcon} />

            {/* Drop */}
            <Marker position={route[route.length - 1]} icon={dropIcon} />

            {/* Route Line */}
            {segments.map((seg, index) => (
              <Polyline
                key={index}
                positions={seg.points}
                pathOptions={{ color: seg.color, weight: 5 }}
              />
            ))}

            {/* Driver Car */}
            {driverPosition && (
              <Marker position={driverPosition} icon={carIcon} />
            )}

            {poolAccepted && secondRider && (
              <>
                {/* Rider 2 Pickup */}
                <Marker
                  position={secondRider.pickupCoords}
                  icon={riderIcon}
                />

                {/* Rider 2 Drop */}
                <Marker
                  position={secondRider.dropCoords}
                  icon={riderIcon}
                />
              </>
            )}
          </MapContainer>
        )}

        {driver && (
          <div style={{
            marginTop: "15px",
            padding: "12px",
            background: "#1b5e20",
            borderRadius: "10px",
            color: "white"
          }}>
            <h4>Driver Assigned</h4>
            <p><strong>{driver.name}</strong></p>
            <p>⭐ {driver.rating}</p>
            <p>ETA: {eta} minutes</p>
          </div>
        )}

        {poolAccepted && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              background: "#1b5e20",
              borderRadius: "10px",
              color: "white"
            }}
          >
            ✅ Pool ride confirmed. Fare updated.
          </div>
        )}

        {fare && (
          <div style={{ marginTop: "15px", color: "white" }}>
            <p>Distance: {distance} km</p>
            <h3>Estimated Fare: ₹{fare}</h3>
          </div>
        )}
        {poolAccepted && secondRider && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              background: "#1b5e20",
              borderRadius: "10px",
              color: "white"
            }}
          >
            ✅ Pool ride confirmed with {secondRider.name}.
          </div>
        )}
        {
          rideStatus === "arrived" && (
            <div style={{
              marginTop: "15px",
              padding: "12px",
              background: "#1565c0",
              borderRadius: "10px",
              color: "white"
            }}>
              🚗 Driver has arrived at pickup location.
            </div>
          )
        }

        {showPool && !poolAccepted && secondRider && (
          <div
            style={{
              marginTop: "15px",
              padding: "15px",
              background: "#263238",
              borderRadius: "10px",
              color: "white"
            }}
          >
            <h4>🚘 Pool Ride Available</h4>

            <p><strong>Rider:</strong> {secondRider.name}</p>
            <p>⭐ {secondRider.rating}</p>

            <hr style={{ opacity: 0.3 }} />

            <p><strong>Pickup:</strong> {secondRider.pickup}</p>
            <p><strong>Destination:</strong> {secondRider.drop}</p>

            <hr style={{ opacity: 0.3 }} />

            <h4>Your Fare: ₹{poolFare}</h4>
            <p>{secondRider.name}'s Fare: ₹{secondRider.fare}</p>

            <button
              onClick={handleAcceptPool}
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: "#00c853",
                border: "none",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer"
              }}
            >
              Accept Pool Ride
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;