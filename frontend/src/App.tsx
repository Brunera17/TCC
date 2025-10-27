import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import PrivateRoute from './routes/PrivateRoute'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import { DashboardPage } from './pages/DashboardPage'
import { PropostasPage } from './pages/PropostasPage'
import { OrdemServicosPage } from './pages/OrdemServicosPage'
import { ClientesPage } from './pages/ClientesPage'
import FuncionariosPage from './pages/FuncionariosPage'
import { CargosPage } from './pages/CargosPage'
import { TiposAtividadePage } from './pages/TiposAtividadePage'
import { RegimesTributariosPage } from './pages/RegimesTributariosPage'
import ServicosPage from './pages/ServicosPage'

const AgendaPage = () => (
  <div className="space-y-6">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
      <p className="text-sm text-gray-500">Gerencie compromissos e agendamentos</p>
    </div>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-bold mb-4">Calendário de Agenda</h2>
      <p>Página em desenvolvimento...</p>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      
      {/* Rotas aninhadas com Layout da Home */}
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        {/* Dashboard como página inicial */}
        <Route index element={<DashboardPage />} />
      </Route>

      {/* Rotas principais */}
      <Route 
        path="/propostas"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<PropostasPage />} />
      </Route>

      <Route 
        path="/ordem-servicos"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<OrdemServicosPage />} />
      </Route>

      <Route 
        path="/clientes"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<ClientesPage />} />
      </Route>

      {/* Rotas de gestão */}
      <Route 
        path="/funcionarios"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<FuncionariosPage />} />
      </Route>

      <Route 
        path="/cargos"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<CargosPage />} />
      </Route>

      <Route 
        path="/tipos-atividade"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<TiposAtividadePage />} />
      </Route>

      <Route 
        path="/regimes-tributarios"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<RegimesTributariosPage />} />
      </Route>

      <Route 
        path="/servicos"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<ServicosPage />} />
      </Route>

      {/* Rotas de análise */}
      <Route 
        path="/relatorios"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<Relatorios />} />
      </Route>

      <Route 
        path="/agenda"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<AgendaPage />} />
      </Route>

      {/* Rotas de sistema */}
      <Route 
        path="/configuracoes"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      >
        <Route index element={<Configuracoes />} />
      </Route>
    </Routes>
  )
}

export default App
