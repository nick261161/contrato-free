import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { NovoContrato } from './pages/NovoContrato'
import { Perfil } from './pages/Perfil'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 1. Landing page */}
        <Route path="/" element={<Home />} />

        {/* 2. Autenticação do freelancer */}
        <Route path="/login" element={<Login />} />

        {/* 3. Painel de contratos e métricas (protegida) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* 4. Wizard de geração de contrato (protegida) */}
        <Route
          path="/novo-contrato"
          element={
            <ProtectedRoute>
              <NovoContrato />
            </ProtectedRoute>
          }
        />

        {/* 5. Configurações do freelancer e termos padrão (protegida) */}
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        {/* Redireciona qualquer rota desconhecida para a home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </AuthProvider>
  )
}
