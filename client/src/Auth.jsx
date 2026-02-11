'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';

  try {
    const res = await fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, password: formData.password })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Auth failed');
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));

    setIsAuthenticated(true);
    
    if (onAuthSuccess) {
      onAuthSuccess(data.user);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};

  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#050505' }}>
        <style>{`
          @keyframes scan-line {
            0% { top: -100%; }
            100% { top: 100%; }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); }
            50% { box-shadow: 0 0 40px rgba(0, 255, 0, 0.6); }
          }
          .scan-effect {
            position: relative;
            overflow: hidden;
          }
          .scan-effect::before {
            content: '';
            position: absolute;
            top: -100%;
            left: 0;
            width: 100%;
            height: 20%;
            background: linear-gradient(to bottom, rgba(0, 255, 0, 0.3), transparent);
            animation: scan-line 3s infinite;
            pointer-events: none;
          }
          .glow-text {
            animation: pulse-glow 2s infinite;
          }
        `}</style>

        <div className="relative w-full max-w-md">
          <div 
            className="scan-effect backdrop-blur-xl border-2 px-8 py-12 rounded-none shadow-2xl relative z-10"
            style={{
              borderColor: '#00ff00',
              backgroundColor: 'rgba(0, 20, 0, 0.4)',
              boxShadow: '0 0 60px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0, 255, 0, 0.1)',
            }}
          >
          
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, 0.05) 25%, rgba(0, 255, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, 0.05) 75%, rgba(0, 255, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, 0.05) 25%, rgba(0, 255, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, 0.05) 75%, rgba(0, 255, 0, 0.05) 76%, transparent 77%, transparent)`,
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative z-20">
              <div className="text-center mb-8">
                <div 
                  className="inline-block mb-4 p-3 rounded-none"
                  style={{
                    border: '2px solid #00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                  }}
                >
                  <CheckCircle size={32} style={{ color: '#00ff00' }} />
                </div>
                <h1 className="text-3xl font-bold mb-2 font-mono" style={{ color: '#00ff00' }}>
                  Access Granted
                </h1>
                <p className="text-sm font-mono" style={{ color: '#888888' }}>
                  Welcome to NexusBoard
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div 
                  className="p-3 rounded-none border"
                  style={{
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.05)',
                  }}
                >
                  <p className="text-xs font-mono" style={{ color: '#888888' }}>
                    Account
                  </p>
                  <p className="font-mono text-sm mt-1" style={{ color: '#00ff00' }}>
                    {formData.email}
                  </p>
                </div>

                <div 
                  className="p-3 rounded-none border"
                  style={{
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.05)',
                  }}
                >
                  <p className="text-xs font-mono" style={{ color: '#888888' }}>
                    Status
                  </p>
                  <p className="font-mono text-sm mt-1" style={{ color: '#00ff00' }}>
                    ● Active
                  </p>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-none font-mono font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#00ff00',
                  color: '#050505',
                  border: '2px solid #00ff00',
                  boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 40px rgba(0, 255, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.2)';
                }}
              >
                Return to Dashboard
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div 
            className="absolute inset-0 rounded-none opacity-50 blur-lg -z-10"
            style={{
              background: 'rgba(0, 255, 0, 0.2)',
              filter: 'blur(20px)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#050505' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 10px rgba(0, 255, 0, 0.1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(0, 255, 0, 0.5), inset 0 0 15px rgba(0, 255, 0, 0.2);
          }
        }
        @keyframes cursor-blink {
          0%, 49%, 100% { border-color: #00ff00; }
          50%, 99% { border-color: transparent; }
        }
        .floating {
          animation: float 6s ease-in-out infinite;
        }
        .glow-card {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .cursor-input::placeholder {
          color: #333333;
        }
        input {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute floating"
          style={{
            top: '10%',
            right: '10%',
            width: '300px',
            height: '300px',
            borderRadius: '0',
            background: 'radial-gradient(circle, rgba(0, 255, 0, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute floating"
          style={{
            bottom: '10%',
            left: '5%',
            width: '400px',
            height: '400px',
            borderRadius: '0',
            background: 'radial-gradient(circle, rgba(0, 255, 0, 0.05) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animationDelay: '1s',
          }}
        />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md px-6 z-10">
        <div 
          className="glow-card backdrop-blur-xl border-2 px-8 py-10 rounded-none relative shadow-2xl"
          style={{
            borderColor: '#00ff00',
            backgroundColor: 'rgba(5, 5, 5, 0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, 0.05) 25%, rgba(0, 255, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, 0.05) 75%, rgba(0, 255, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, 0.05) 25%, rgba(0, 255, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, 0.05) 75%, rgba(0, 255, 0, 0.05) 76%, transparent 77%, transparent)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono mb-2" style={{ color: '#00ff00' }}>
                NEXUS
              </h1>
              <p className="text-sm font-mono" style={{ color: '#888888' }}>
                {isSignup ? 'Initialize Account' : 'System Access'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-xs font-mono mb-2 uppercase tracking-wider" style={{ color: '#666666' }}>
                  Email Address
                </label>
                <div 
                  className="flex items-center border-2 px-4 py-3 focus-within:ring-2 transition-all duration-300"
                  style={{
                    borderColor: formData.email ? '#00ff00' : '#333333',
                    backgroundColor: 'rgba(0, 20, 0, 0.3)',
                    boxShadow: formData.email ? '0 0 20px rgba(0, 255, 0, 0.2)' : 'none',
                  }}
                >
                  <Mail size={18} style={{ color: '#00ff00' }} className="mr-3" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="user@nexus.ai"
                    className="flex-1 bg-transparent text-sm outline-none cursor-input"
                    style={{ color: '#00ff00' }}
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-mono mb-2 uppercase tracking-wider" style={{ color: '#666666' }}>
                  Password
                </label>
                <div 
                  className="flex items-center border-2 px-4 py-3 focus-within:ring-2 transition-all duration-300"
                  style={{
                    borderColor: formData.password ? '#00ff00' : '#333333',
                    backgroundColor: 'rgba(0, 20, 0, 0.3)',
                    boxShadow: formData.password ? '0 0 20px rgba(0, 255, 0, 0.2)' : 'none',
                  }}
                >
                  <Lock size={18} style={{ color: '#00ff00' }} className="mr-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    className="flex-1 bg-transparent text-sm outline-none cursor-input"
                    style={{ color: '#00ff00' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 transition-colors duration-200"
                    style={{ color: '#00ff00' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {isSignup && (
                <div className="relative">
                  <label className="block text-xs font-mono mb-2 uppercase tracking-wider" style={{ color: '#666666' }}>
                    Confirm Password
                  </label>
                  <div 
                    className="flex items-center border-2 px-4 py-3 focus-within:ring-2 transition-all duration-300"
                    style={{
                      borderColor: formData.confirmPassword ? '#00ff00' : '#333333',
                      backgroundColor: 'rgba(0, 20, 0, 0.3)',
                      boxShadow: formData.confirmPassword ? '0 0 20px rgba(0, 255, 0, 0.2)' : 'none',
                    }}
                  >
                    <Lock size={18} style={{ color: '#00ff00' }} className="mr-3" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••••••"
                      className="flex-1 bg-transparent text-sm outline-none cursor-input"
                      style={{ color: '#00ff00' }}
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-none font-mono font-bold text-sm transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading ? 'rgba(0, 255, 0, 0.2)' : '#00ff00',
                  color: '#050505',
                  border: '2px solid #00ff00',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.boxShadow = '0 0 40px rgba(0, 255, 0, 0.6)';
                    e.target.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                {loading ? 'Initializing...' : isSignup ? 'Create Account' : 'Authenticate'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
            <div className="mt-6 text-center border-t border-gray-700 pt-6">
              <p className="text-xs font-mono mb-4" style={{ color: '#888888' }}>
                {isSignup ? 'Already have access?' : 'Need an account?'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setFormData({ email: '', password: '', confirmPassword: '' });
                }}
                className="px-6 py-2 rounded-none font-mono text-sm font-bold transition-all duration-300 border-2"
                style={{
                  color: '#00ff00',
                  borderColor: '#00ff00',
                  backgroundColor: 'transparent',
                  boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.2)';
                }}
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>
        <div 
          className="absolute inset-0 rounded-none opacity-40 blur-xl -z-10"
          style={{
            background: 'rgba(0, 255, 0, 0.15)',
            filter: 'blur(30px)',
          }}
        />
      </div>
    </div>
  );
};

export default Auth;
