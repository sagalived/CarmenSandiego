import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './componentes/páginas/Home';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App