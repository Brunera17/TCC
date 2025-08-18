import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import PrivateRoute from './routes/PrivateRoute'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'

function App() {

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route 
        path="/relatorios"
        element={
          <PrivateRoute>
            <Relatorios/>
          </PrivateRoute>
        }
      />
      <Route 
        path="/configuracores"
        element={
          <PrivateRoute>
            <Configuracoes/>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
