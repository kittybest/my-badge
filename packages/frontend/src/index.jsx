import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import 'semantic-ui-css/semantic.min.css'

import Layout from './layout/Layout'
import Home from './pages/Home'
import Start from './pages/Start'
import Dashboard from './pages/Dashboard'
import './stylesheet/index.scss'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="start" element={<Start />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
