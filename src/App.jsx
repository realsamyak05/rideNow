import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import DriverRegister from "./pages/DriverRegister";
import Ride from "./pages/Ride";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/driver-register" element={<DriverRegister />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Ride />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;