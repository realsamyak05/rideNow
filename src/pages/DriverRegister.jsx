import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DriverRegister() {
    const [form, setForm] = useState({
        name: "",
        contact: "",
        license: "",
        vehicle: ""
    });

    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = (e) => {
        e.preventDefault();

        if (!form.name || !form.contact || !form.license || !form.vehicle) {
            alert("Fill all fields");
            return;
        }

        localStorage.setItem("driverData", JSON.stringify(form));
        localStorage.setItem("userRole", "driver");
        localStorage.setItem("isAuthenticated", "true");

        navigate("/");
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Driver Registration</h2>

                <form onSubmit={handleRegister}>
                    <input
                        name="name"
                        placeholder="Full Name"
                        style={styles.input}
                        onChange={handleChange}
                    />

                    <input
                        name="contact"
                        placeholder="Contact Number"
                        style={styles.input}
                        onChange={handleChange}
                    />

                    <input
                        name="license"
                        placeholder="Driver License Number"
                        style={styles.input}
                        onChange={handleChange}
                    />

                    <input
                        name="vehicle"
                        placeholder="Vehicle Number"
                        style={styles.input}
                        onChange={handleChange}
                    />

                    <button type="submit" style={styles.button}>
                        Register & Continue
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#121212"
    },
    card: {
        background: "#1e1e1e",
        padding: "30px",
        borderRadius: "12px",
        width: "320px",
        color: "white"
    },
    input: {
        width: "100%",
        padding: "8px",
        marginBottom: "10px"
    },
    button: {
        width: "100%",
        padding: "8px",
        background: "#1db954",
        border: "none",
        color: "white",
        borderRadius: "6px"
    }
};

export default DriverRegister;