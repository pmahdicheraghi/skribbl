import React from 'react';
import ReactDOM from 'react-dom/client';
import 'wired-elements';
import './index.css';
import App from './App.js';
import { installIosViewportFix } from './iosViewport.js';

installIosViewportFix();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
