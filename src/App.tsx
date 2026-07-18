import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { AdminLayout } from './components/AdminLayout'
import { Loading } from './components/ui'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const NewRequest = lazy(() => import('./pages/NewRequest').then((module) => ({ default: module.NewRequest })))
const PublicForm = lazy(() => import('./pages/PublicForm').then((module) => ({ default: module.PublicForm })))
const RequestDetail = lazy(() => import('./pages/RequestDetail').then((module) => ({ default: module.RequestDetail })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

export default function App() {
  return (
    <Suspense fallback={<Loading label="Abrindo…" />}>
      <Routes>
        <Route path="/preencher/:token" element={<PublicForm />} />
        <Route
          element={
            <AdminGate>
              <AdminLayout />
            </AdminGate>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="/nova" element={<NewRequest />} />
          <Route path="/solicitacoes/:id" element={<RequestDetail />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
