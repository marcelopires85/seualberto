import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Footer } from './components/footer'
import { Navbar } from './components/navbar'
import { Section } from './components/section'

// Importe os componentes das páginas (você precisará criá-los)
import { Home } from './pages/Home'
import { Login } from './pages/Login'

function App() {
  return (
    <Router>
      {/* Navbar fixo em todas as páginas */}
      <Navbar />
      
      <Routes>
        {/* Página Home */}
        <Route path="/" element={
          <>
            <Section />
            {/* Adicione outros componentes da home aqui */}
            <Footer />
          </>
        } />
        
        {/* Página Login */}
        <Route path="/login" element={
          <>
            <Login />
            {/* Footer pode ser opcional na página de login */}
            <Footer />
          </>
        } />
      </Routes>
    </Router>
  )
}

export default App