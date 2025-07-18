import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// You might have an index.css or similar for global styles.
// For this project, Tailwind CSS is loaded via CDN in index.html.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
