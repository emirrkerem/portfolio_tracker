import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// 1. BrowserRouter yerine HashRouter'ı import edin
import { HashRouter } from 'react-router-dom' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. App bileşenini HashRouter ile sarmalayın */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
