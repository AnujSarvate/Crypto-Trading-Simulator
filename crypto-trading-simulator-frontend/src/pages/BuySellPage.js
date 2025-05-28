import React, { useState } from 'react';
import axios from '../utils/axiosInstance';
import BuySellForm from '../components/BuySellForm';

function BuySellPage({ portfolio, cryptoData, walletBalance, setWalletBalance, refreshUserData}) {
  const [message, setMessage] = useState('');

  const handleTrade = async ({ symbol, amount, type, price }) => {
    try {
      const token = localStorage.getItem('token');

      const payload = {
        action: type,      // "buy" or "sell"
        coin: symbol,      // Coin ID (like "bitcoin", "ethereum")
        amount: price * amount, // Pass price × quantity (this fixes backend logic)
      };

      await axios.put('/trade', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol}`);
      
      // Refresh wallet after trade
      const userRes = await axios.get('/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setWalletBalance(userRes.data.walletBalance);

    } catch (error) {
      console.error(error);
      setMessage(error.response?.data || 'Trade failed');
    }
  };

  return (
    <div>
      <h2>Trade Crypto</h2>

      {cryptoData.length === 0 ? (
        <p>Loading crypto list...</p>
      ) : (
        <BuySellForm
          onTrade={handleTrade}
          allowedCryptos={cryptoData}
          portfolio={portfolio}
          walletBalance={walletBalance}
          setWalletBalance={setWalletBalance}
          refreshUserData={refreshUserData}
        />
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

export default BuySellPage;