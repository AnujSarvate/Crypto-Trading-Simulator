import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Raw axios for login
import axiosInstance from '../utils/axiosInstance'; // Authenticated axios for /me

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) navigate('/');
}, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Use raw axios for login to get JWT
      const res = await axios.post('http://localhost:8080/api/login', { username, password });
      const token = res.data;

      // Save token and fetch user data
      localStorage.setItem('token', token);

      const userRes = await axiosInstance.get('/me');
      onLoginSuccess(userRes.data);

      navigate('/');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;