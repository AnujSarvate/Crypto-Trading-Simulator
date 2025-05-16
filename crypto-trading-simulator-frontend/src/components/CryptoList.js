import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';

function CryptoList() {
  const [cryptoData, setCryptoData] = useState([]);

  useEffect(() => {
    axios.get('/crypto/list')
      .then(response => setCryptoData(response.data))
      .catch(error => console.error("Error fetching crypto data:", error));
  }, []);

  return (
    <div>
      <h3>Live Crypto Prices</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Symbol</th>
            <th>Price (USD)</th>
            <th>24h Change</th>
          </tr>
        </thead>
        <tbody>
          {cryptoData.map((coin) => (
            <tr key={coin.id}>
              <td>{coin.name}</td>
              <td>{coin.symbol.toUpperCase()}</td>
              <td>${coin.current_price.toLocaleString()}</td>
              <td style={{ color: coin.price_change_percentage_24h >= 0 ? 'green' : 'red' }}>
                {coin.price_change_percentage_24h.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CryptoList;