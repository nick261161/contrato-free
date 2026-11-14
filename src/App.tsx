import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

/**
 * Code splitting: cada página vira um chunk separado. Quem cai na landing
 * (ou no link público de assinatura) não baixa o código do painel/wizard.
 */
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha').then((m) => ({ default: m.EsqueciSenha })))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha').then((m) => ({ default: m.RedefinirSenha })))
const Assinar = lazy(() => import('./pages/Assinar').then((m) => ({ default: m.Assinar })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const NovoContrato = lazy(() => import('./pages/NovoContrato').then((m) => ({ default: m.NovoContrato })))
const Perfil = lazy(() => import('./pages/Perfil').then((m) => ({ default: m.Perfil })))
const Clientes = lazy(() => import('./pages/Clientes').then((m) => ({ default: m.Clientes })))
const Termos = lazy(() => import('./pages/Termos').then((m) => ({ default: m.Termos })))
const Privacidade = lazy(() => import('./pages/Privacidade').then((m) => ({ default: m.Privacidade })))
const NaoEncontrada = lazy(() => import('./pages/NaoEncontrada').then((m) => ({ default: m.NaoEncontrada })))

export default function App() {
  return (
    // Boundary fora do AuthProvider: protege também contra erros nele.
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<p className="page-loading">Carregando…</p>}>
          <Routes>
            {/* 1. Landing page */}
            <Route path="/" element={<Home />} />

            {/* 2. Autenticação do freelancer */}
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<RedefinirSenha />} />

            {/* Página PÚBLICA: cliente recebe o link e assina sem login */}
            <Route path="/assinar/:id" element={<Assinar />} />

            {/* 3. Painel de contratos e métricas (protegida) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* 4. Wizard de geração de contrato (protegida) — também edita via /novo-contrato/:id */}
            <Route
              path="/novo-contrato"
              element={
                <ProtectedRoute>
                  <NovoContrato />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novo-contrato/:id"
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

            {/* 6. Agenda de clientes salvos (protegida) */}
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              }
            />

            {/* Páginas legais (rodapé) */}
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />

            {/* Endereço desconhecido →404 de verdade */}
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  )
}
