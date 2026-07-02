import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ProjectInfo from './ProjectInfo';

export default function AuthPage({ handleAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = location.pathname === '/register';
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Clear fields when toggling mode
  useEffect(() => {
    setUsername("");
    setPassword("");
  }, [isRegister]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleAuth(username, password, isRegister);
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0a0a0a] font-sans text-[#111111] dark:text-gray-100 transition-colors duration-300">
      {/* LEFT SIDE - FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 border-r border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="w-full max-w-md animate-fadeUp">
          <h2 className="text-3xl font-light mb-2 tracking-tight">
            {isRegister ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-[#999999] dark:text-gray-400 text-sm mb-10 font-mono">
            {isRegister ? "Join to generate docs" : "Welcome back. Please enter your details"}
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-b border-[#dddddd] dark:border-[#333333] bg-transparent outline-none focus:border-[#2dd4a8] transition-colors text-sm"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-b border-[#dddddd] dark:border-[#333333] bg-transparent outline-none focus:border-[#2dd4a8] transition-colors text-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="w-full py-4 bg-[#111111] dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-[#2dd4a8] dark:hover:bg-[#2dd4a8] transition-colors mt-8 rounded-none">
              {isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-[#999999] dark:text-gray-500">
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <Link to={isRegister ? "/login" : "/register"} className="text-[#111111] dark:text-white font-bold hover:text-[#2dd4a8] dark:hover:text-[#2dd4a8] transition-colors">
              {isRegister ? "Sign In" : "Create Account"}
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - PROJECT INFO */}
      <ProjectInfo />
    </div>
  );
}
