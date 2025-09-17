import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Footer } from './components/footer'
import { Navbar } from './components/navbar'
import { Section } from './components/section'


function App() {
  
  return (
    <Router>
      <Routes>
     <Route path='/' element={<Navbar />} />
     <Route path='/' element={<Section />} />
     <Route path='/' element={<Footer />} />
     </Routes>
    </Router>     


    
  );
}

export default App
