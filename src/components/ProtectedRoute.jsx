import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
    const isAuthenticated = localStorage.getItem("isAuthenticated");

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
}

export default ProtectedRoute;