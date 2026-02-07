import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const nav = useNavigate();

  const submit = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/auth/login/",
        form
      );

      // SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      alert("Login successful");
      nav("/");
    } catch (err) {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="bg-[#111] p-8 rounded-xl w-80">
        <h2 className="text-2xl mb-6 text-center">Login</h2>

        <input
          className="w-full mb-3 p-2 bg-black border border-gray-700 rounded"
          placeholder="Username"
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        <input
          type="password"
          className="w-full mb-5 p-2 bg-black border border-gray-700 rounded"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={submit}
          className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}
