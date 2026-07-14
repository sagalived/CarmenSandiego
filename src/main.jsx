import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root nao encontrado no DOM')
}

ReactDOM.createRoot(rootElement).render(
  <App />
)
