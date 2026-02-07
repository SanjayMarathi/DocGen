import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext);

  const logout = async () => {
    await axios.post("http://127.0.0.1:8000/api/auth/logout/", {}, { withCredentials: true });
    setUser(null);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#0b0b0b] border-b border-white/10 px-6 py-3 flex justify-between items-center z-50">
      <h1 className="text-purple-400 font-bold text-xl">DocGen</h1>

      {user ? (
        <div className="flex gap-6 items-center">
          <Link to="/profile" className="hover:text-purple-300">{user.username}</Link>
          <Link to="/settings" className="hover:text-purple-300">Settings</Link>
          <button onClick={logout} className="text-red-400">Logout</button>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </div>
  );
}
