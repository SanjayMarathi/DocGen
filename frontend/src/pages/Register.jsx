import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "" });
  const nav = useNavigate();

  const submit = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/api/auth/register/", form);
      alert("Account created!");
      nav("/login");
    } catch {
      alert("User already exists");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="bg-[#111] p-8 rounded-xl w-80">
        <h2 className="text-2xl mb-6 text-center">Register</h2>

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
          className="w-full bg-green-600 hover:bg-green-700 py-2 rounded"
        >
          Register
        </button>
      </div>
    </div>
  );
}
