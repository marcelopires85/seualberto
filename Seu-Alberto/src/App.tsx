import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Footer } from './components/footer'
import { Navbar } from './components/navbar'

import { Home } from './pages/Home'
import { Login } from './pages/Login'

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <>
              <Login />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  )
}

export default App