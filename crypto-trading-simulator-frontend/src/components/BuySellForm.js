import React, { useState } from 'react';
import axios from '../utils/axiosInstance';

function BuySellForm({ allowedCryptos, refreshUserData }) {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('buy');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const cleanSymbol = symbol.trim().toUpperCase();
    const crypto = allowedCryptos.find(c => c.symbol.toUpperCase() === cleanSymbol);

    if (!crypto) {
      setMessage(`'${cleanSymbol}' is not a valid crypto symbol.`);
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      setMessage('Enter a valid positive amount.');
      return;
    }

    const payload = {
      action: type,
      coin: crypto.id,
      amount: tradeAmount,
      price: crypto.current_price  // Sent from frontend
    };

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/trade', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(res.data);
      setSymbol('');
      setAmount('');
      setType('buy');

        if (refreshUserData) {
    await refreshUserData();
  }


    } catch (err) {
      const errMsg = err?.response?.data || 'Trade failed.';
      setMessage(typeof errMsg === 'string' ? errMsg : 'Trade failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Buy/Sell Crypto</h3>
      {message && <p style={{ color: /success|ok/i.test(message) ? 'green' : 'red' }}>{message}</p>}

      <input
        type="text"
        placeholder="Symbol (e.g. BTC)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        min="0.0001"
        step="any"
      />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  );
}

export default BuySellForm;