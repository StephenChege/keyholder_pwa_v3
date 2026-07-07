import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// // Load Google Maps API with key from .env
// const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// if (apiKey) {
//   const script = document.createElement('script');
//   script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
//   script.async = true;
//   script.defer = true;
//   document.head.appendChild(script);
// }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
