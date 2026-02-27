import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

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

function Ride() {
    const [pickup, setPickup] = useState("");
    const [drop, setDrop] = useState("");
    const [route, setRoute] = useState(null);
    const [fare, setFare] = useState(null);
    const [distance, setDistance] = useState(null);

    const [showPool, setShowPool] = useState(false);
    const [driver, setDriver] = useState(null);
    const [driverPosition, setDriverPosition] = useState(null);
    const [eta, setEta] = useState(null);
    const [rideType, setRideType] = useState("solo");
    const [rideStatus, setRideStatus] = useState("idle");
    const [isLoading, setIsLoading] = useState(false);
    const [secondRider, setSecondRider] = useState(null);
    const [poolAccepted, setPoolAccepted] = useState(false);
    const [segments, setSegments] = useState([]);
    const [femaleMode, setFemaleMode] = useState(false);
    const [co2Saved, setCo2Saved] = useState(null);
    const treesEquivalent =
        co2Saved ? (parseFloat(co2Saved) / 21).toFixed(2) : null;


    const intervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const handleAcceptPool = async () => {
        if (!secondRider || !route) return;

        const multiRouteResponse = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${route[0][1]},${route[0][0]};${secondRider.pickupCoords[1]},${secondRider.pickupCoords[0]};${secondRider.dropCoords[1]},${secondRider.dropCoords[0]};${route[route.length - 1][1]},${route[route.length - 1][0]}?overview=full&geometries=geojson`
        ).then(res => res.json());

        if (!multiRouteResponse.routes || multiRouteResponse.routes.length === 0) {
            alert("Pool route failed");
            return;
        }

        const multiRouteCoordinates =
            multiRouteResponse.routes[0].geometry.coordinates.map(coord => [
                coord[1],
                coord[0],
            ]);

        const totalPoints = multiRouteCoordinates.length;

        setSegments([
            { points: multiRouteCoordinates.slice(0, totalPoints / 3), color: "blue" },
            { points: multiRouteCoordinates.slice(totalPoints / 3, (2 * totalPoints) / 3), color: "orange" },
            { points: multiRouteCoordinates.slice((2 * totalPoints) / 3), color: "green" }
        ]);

        setRoute(multiRouteCoordinates);
        setFare(secondRider.discountedFare);
        setPoolAccepted(true);
        if (secondRider?.rawDistance) {
            const co2Kg = (secondRider.rawDistance * 0.12).toFixed(2);
            setCo2Saved(co2Kg);
        }
        setShowPool(false);
    };

    const handleRideRequest = async () => {

        setCo2Saved(null);

        setShowPool(false);
        setPoolAccepted(false);

        console.log("femaleMode:", femaleMode);
        if (!pickup || !drop) {
            alert("Enter pickup and drop");
            return;
        }

        setIsLoading(true);
        setRideStatus("searching");
        setPoolAccepted(false);
        setShowPool(false);

        try {
            const [geoPickup, geoDrop] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${pickup}`).then(res => res.json()),
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${drop}`).then(res => res.json())
            ]);

            if (!geoPickup.length || !geoDrop.length) {
                alert("Location not found");
                setIsLoading(false);
                return;
            }

            const pickupCoords = [parseFloat(geoPickup[0].lat), parseFloat(geoPickup[0].lon)];
            const dropCoords = [parseFloat(geoDrop[0].lat), parseFloat(geoDrop[0].lon)];

            const routeResponse = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${pickupCoords[1]},${pickupCoords[0]};${dropCoords[1]},${dropCoords[0]}?overview=full&geometries=geojson`
            ).then(res => res.json());

            if (!routeResponse.routes || routeResponse.routes.length === 0) {
                alert("Route not found");
                setIsLoading(false);
                return;
            }

            const routeData = routeResponse.routes[0];

            const routeCoordinates =
                routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);

            const distanceKm = routeData.distance / 1000;
            const totalFare = Math.round(50 + distanceKm * 12);
            let rider1Fare = totalFare;

            setRoute(routeCoordinates);
            setDistance(distanceKm.toFixed(2));
            setSegments([{ points: routeCoordinates, color: "blue" }]);

            /* ---------------- DRIVER ASSIGNMENT FIRST ---------------- */

            const randomOffsetLat = (Math.random() - 0.5) * 0.02;
            const randomOffsetLng = (Math.random() - 0.5) * 0.02;

            const driverStart = [
                pickupCoords[0] + randomOffsetLat,
                pickupCoords[1] + randomOffsetLng
            ];

            const driverRouteResponse = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${driverStart[1]},${driverStart[0]};${pickupCoords[1]},${pickupCoords[0]}?overview=full&geometries=geojson`
            ).then(res => res.json());

            if (!driverRouteResponse.routes || !driverRouteResponse.routes.length) {
                alert("Driver route not found");
                setIsLoading(false);
                return;
            }

            const driverPath =
                driverRouteResponse.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);

            const drivers = [
                { name: "Sanjay Kumar", rating: 4.9, gender: "male" },
                { name: "Amit Verma", rating: 4.6, gender: "male" },
                { name: "Priya Sharma", rating: 4.8, gender: "female" },
                { name: "Neha Singh", rating: 4.7, gender: "female" }
            ];

            const availableDrivers =
                femaleMode ? drivers.filter(d => d.gender === "female") : drivers;

            if (!availableDrivers.length) {
                alert("No female drivers available nearby");
                setIsLoading(false);
                return;
            }

            const randomIndex = Math.floor(Math.random() * availableDrivers.length);
            const assignedDriver = availableDrivers[randomIndex];

            setDriver(assignedDriver);
            setDriverPosition(driverStart);

            const estimatedTime = Math.floor(Math.random() * 6) + 3;
            setEta(estimatedTime);
            setRideStatus("assigned");

            if (intervalRef.current) clearInterval(intervalRef.current);

            let currentIndex = 0;
            let progress = 0;

            intervalRef.current = setInterval(() => {
                if (currentIndex >= driverPath.length - 1) {
                    clearInterval(intervalRef.current);
                    setDriverPosition(driverPath[driverPath.length - 1]);
                    setEta(0);
                    setRideStatus("arrived");
                    return;
                }

                const start = driverPath[currentIndex];
                const end = driverPath[currentIndex + 1];

                setDriverPosition([
                    start[0] + (end[0] - start[0]) * progress,
                    start[1] + (end[1] - start[1]) * progress
                ]);

                progress += 0.05;
                if (progress >= 1) {
                    progress = 0;
                    currentIndex++;
                }
            }, 200);

            /* ---------------- POOL LOGIC AFTER DRIVER ---------------- */

            if (rideType === "pool") {
                const totalPoints = routeCoordinates.length;

                const rider2PickupCoords =
                    routeCoordinates[Math.floor(totalPoints * 0.3)];

                const rider2DropCoords =
                    routeCoordinates[Math.floor(totalPoints * 0.7)];

                const rider2RouteResponse = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${rider2PickupCoords[1]},${rider2PickupCoords[0]};${rider2DropCoords[1]},${rider2DropCoords[0]}?overview=false`
                ).then(res => res.json());

                if (!rider2RouteResponse.routes || !rider2RouteResponse.routes.length) {
                    setIsLoading(false);
                    return;
                }

                const rider2DistanceKm =
                    rider2RouteResponse.routes[0].distance / 1000;

                rider1Fare = Math.round(totalFare * 0.85);
                const rider2Fare = Math.round((50 + rider2DistanceKm * 12) * 0.85);



                const possibleRiders = [
                    { name: "Ananya Kapoor", rating: 4.6, gender: "female", fare: rider2Fare },
                    { name: "Rohit Mehta", rating: 4.5, gender: "male", fare: rider2Fare }
                ];

                const filtered =
                    femaleMode ? possibleRiders.filter(r => r.gender === "female") : possibleRiders;

                if (filtered.length) {
                    const randomRider =
                        filtered[Math.floor(Math.random() * filtered.length)];

                    setSecondRider({
                        ...randomRider,
                        pickupCoords: rider2PickupCoords,
                        dropCoords: rider2DropCoords,
                        pickup: "Auto-matched along route",
                        drop: "Auto-matched along route",
                        rawDistance: rider2DistanceKm,
                        discountedFare: rider1Fare   // ✅ store directly
                    });

                    setShowPool(true);
                }

                setFare(rider1Fare);
            } else {
                setFare(totalFare);
            }

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

                <div style={{ marginTop: "10px" }}>
                    <button
                        onClick={() => setFemaleMode(!femaleMode)}
                        style={{
                            background: femaleMode ? "#e91e63" : "#333",
                            color: "white",
                            padding: "8px",
                            borderRadius: "8px",
                            border: "none",
                            width: "100%"
                        }}
                    >
                        {femaleMode ? "Female Safety Mode ON" : "Female Safety Mode OFF"}
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

                        {femaleMode && (
                            <p style={{ color: "#ff4081" }}>♀ Female Safety Ride</p>
                        )}
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
                        {co2Saved && (
                            <>
                                <p style={{ marginTop: "5px", color: "#a5d6a7" }}>
                                    🌱 You saved approximately {co2Saved} kg of CO₂ by pooling.
                                </p>
                                <p style={{ fontSize: "14px", opacity: 0.85 }}>
                                    Equivalent to {treesEquivalent} trees absorbing CO₂ for a year.
                                </p>
                            </>
                        )}
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

                        <h4>Your Fare: ₹{secondRider.discountedFare}</h4>
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

export default Ride;