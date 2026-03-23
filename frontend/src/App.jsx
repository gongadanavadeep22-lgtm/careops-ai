import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

import Login from './pages/Login';
import NurseDashboard from './pages/NurseDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import OpsDashboard from './pages/OpsDashboard';
import PatientRegister from './pages/PatientRegister';
import AppointmentBook from './pages/AppointmentBook';
import PatientWaiting from './pages/PatientWaiting';
import Demo from './pages/Demo';
import PatientDashboard from './pages/PatientDashboard';
import PaymentSuccess from './pages/PaymentSuccess';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/nurse"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['nurse']}>
                  <NurseDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['pharmacist']}>
                  <PharmacyDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ops"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['ops']}>
                  <OpsDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients/register"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['nurse', 'ops']}>
                  <PatientRegister />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments/book"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['nurse', 'doctor', 'ops']}>
                  <AppointmentBook />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients/waiting"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['nurse', 'doctor']}>
                  <PatientWaiting />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <Demo />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['patient']}>
                  <PatientDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route path="/payment-success" element={<PaymentSuccess />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
