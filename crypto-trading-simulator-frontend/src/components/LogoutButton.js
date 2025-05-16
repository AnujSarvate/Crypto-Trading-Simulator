import React from 'react';
import { useNavigate } from 'react-router-dom';

function LogoutButton({ setWalletBalance, setPortfolio }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');

  
    setWalletBalance(0);
    setPortfolio({});

    navigate('/login');
  };

  return (
    <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>
      Logout
    </button>
  );
}

export default LogoutButton;