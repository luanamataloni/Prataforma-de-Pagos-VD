// ============================================================
// MAIN.JSX - PUNTO DE ENTRADA DE LA APLICACIÓN REACT
// ============================================================

// 1 - IMPORTO REACT Y REACT-DOM:
import React from 'react';
import ReactDOM from 'react-dom/client';

// 2 - IMPORTO EL ROUTER Y LA APP:
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// 3 - IMPORTO LOS ESTILOS GLOBALES:
import './index.css';

// 4 - MONTO LA APP EN EL DIV #root DEL HTML:
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

