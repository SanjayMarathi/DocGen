import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import ProjectInfo from './ProjectInfo';

export default function AuthPage({ handleAuthSubmit }) {
  const location = useLocation();
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
    handleAuthSubmit(username, password, isRegister);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-[#111111]">
      {/* LEFT SIDE - FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 border-r border-[#f0f0f0]">
        <div className="w-full max-w-md animate-fadeUp">
          <h2 className="text-3xl font-light mb-2 tracking-tight">
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className="text-[#999999] text-sm mb-10 font-mono">
            {isRegister ? "Join to generate docs" : "Please enter your details"}
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-b border-[#dddddd] bg-transparent outline-none focus:border-[#2dd4a8] transition-colors text-sm"
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
                className="w-full px-4 py-3 border-b border-[#dddddd] bg-transparent outline-none focus:border-[#2dd4a8] transition-colors text-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="w-full py-4 bg-[#111111] text-white text-sm font-medium hover:bg-[#2dd4a8] transition-colors mt-8">
              {isRegister ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-[#999999]">
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <Link to={isRegister ? "/login" : "/register"} className="text-[#111111] font-semibold hover:text-[#2dd4a8] transition-colors">
              {isRegister ? "Sign in" : "Create one"}
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - PROJECT INFO */}
      <ProjectInfo />
    </div>
  );
}
