import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import HomePage from './pages/HomePage';
import PortfolioPage from './pages/PortfolioPage';
import BuySellPage from './pages/BuySellPage';
import WalletSummary from './components/WalletSummary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LogoutButton from './components/LogoutButton';

import axios from './utils/axiosInstance';

function App() {
  const [cryptoData, setCryptoData] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [portfolio, setPortfolio] = useState({});

  // Load crypto prices
  useEffect(() => {
    axios.get('/crypto/list')
      .then(res => setCryptoData(res.data))
      .catch(err => console.error("Crypto list fetch error", err));
  }, []);

  // Auto-refresh prices every 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('/crypto/list')
        .then(res => setCryptoData(res.data))
        .catch(err => console.error("Auto-refresh price error", err));
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  // Load user data if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/me')
        .then(res => {
          setWalletBalance(res.data.walletBalance);
          setPortfolio(res.data.portfolio);
        })
        .catch(err => {
          console.error('Failed to load user data', err);
        });
    }
  }, []);

  const refreshUserData = async () => {
  try {
    const res = await axios.get('/me');
    setWalletBalance(res.data.walletBalance);
    setPortfolio(res.data.portfolio);
  } catch (err) {
    console.error('Failed to refresh user data', err);
  }
};

  return (
    <Router>
      <div>
        <h1>Crypto Trading Simulator</h1>
        <nav>
          <Link to="/">Home</Link> |{" "}
          <Link to="/portfolio">Portfolio</Link> |{" "}
          <Link to="/trade">Trade</Link> |{" "}
          <Link to="/login">Login</Link> |{" "}
          <Link to="/signup">Signup</Link>{" "}
          {localStorage.getItem('token') && (
  <LogoutButton
    setWalletBalance={setWalletBalance}
    setPortfolio={setPortfolio}
  />
)}
        </nav>

        {/* Only WalletSummary handles walletBalance display */}
        <WalletSummary
          walletBalance={walletBalance}
          setWalletBalance={setWalletBalance}
          setPortfolio={setPortfolio}
        />

        <Routes>
          <Route path="/" element={<HomePage cryptoData={cryptoData} />} />
          <Route path="/portfolio" element={
            <PortfolioPage
              portfolio={portfolio}
              cryptoData={cryptoData}
              walletBalance={walletBalance}
            />
          } />
          <Route path="/trade" element={
            <BuySellPage
              portfolio={portfolio}
              setPortfolio={setPortfolio}
              walletBalance={walletBalance}
              setWalletBalance={setWalletBalance}
              cryptoData={cryptoData}
              refreshUserData={refreshUserData}
            />
          } />
          <Route path="/login" element={
            <LoginPage
              onLoginSuccess={(data) => {
                setWalletBalance(data.walletBalance);
                setPortfolio(data.portfolio);
              }}
            />
          } />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;