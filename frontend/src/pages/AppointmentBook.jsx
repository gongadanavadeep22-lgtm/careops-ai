import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import BookAppointmentForm from '../components/BookAppointmentForm';

export default function AppointmentBook() {
  const { role } = useAuth();

  if (role === 'nurse') {
    return <Navigate to="/nurse?view=book" replace />;
  }

  if (role === 'doctor') {
    return <Navigate to="/doctor" replace />;
  }

  if (role === 'ops') {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-sm text-gray-500">Schedule a patient visit for the clinic.</p>
          <BookAppointmentForm onSuccess={() => {}} />
        </div>
      </Layout>
    );
  }

  return <Navigate to="/login" replace />;
}
