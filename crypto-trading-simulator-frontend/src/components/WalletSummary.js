import React, { useState } from 'react';
import axios from '../utils/axiosInstance';

function WalletSummary({ walletBalance, setWalletBalance, setPortfolio }) {
  const [depositAmount, setDepositAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    const token = localStorage.getItem('token');

     if (!token) {
    setError("You must be logged in to deposit.");
    setMessage('');
    return;
  }

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount.');
      setMessage('');
      return;
    }

    try {
      await axios.post(
        '/deposit',
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh wallet and portfolio after deposit
      const res = await axios.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWalletBalance(res.data.walletBalance);
      setPortfolio(res.data.portfolio);
      setDepositAmount('');
      setMessage('Deposit successful!');
      setError('');
    } catch (err) {
      setMessage('');
      setError(err.response?.data || 'Deposit failed.');
    }
  };

  return (
    <div>
      <h3>Wallet Balance: ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>

      <form onSubmit={handleDeposit}>
        <input
          type="number"
          placeholder="Deposit amount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          min="0.01"
          step="any"
          required
        />
        <button type="submit">Deposit</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
    </div>
  );
}

export default WalletSummary;