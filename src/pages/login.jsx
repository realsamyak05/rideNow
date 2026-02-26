import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Enter credentials");
            return;
        }

        localStorage.setItem("isAuthenticated", "true");
        navigate("/");
    };

    return (
        <div style={{ padding: "40px" }}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <br />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <br />
                <button type="submit">Login</button>
            </form>

            <button onClick={() => navigate("/driver-register")}>
                Register as Driver
            </button>
        </div>
    );
}

export default Login;