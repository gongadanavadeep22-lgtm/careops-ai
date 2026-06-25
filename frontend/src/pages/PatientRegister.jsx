import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function PatientRegister() {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Registration</h1>
          <p className="mt-1 text-sm text-gray-500">How new patients join CareOps.</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 text-sm text-gray-700">
          <p>
            Patients register themselves by signing in with a <strong>patient</strong> account, then completing their
            profile on the patient dashboard.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a Firebase user with role <code className="text-xs bg-gray-100 px-1 rounded">patient</code> in Authentication.</li>
            <li>Add a Firestore <code className="text-xs bg-gray-100 px-1 rounded">users/{'{uid}'}</code> doc with <code className="text-xs bg-gray-100 px-1 rounded">role: patient</code>.</li>
            <li>Patient signs in at <Link to="/login" className="text-primary-600 hover:underline">/login</Link> and fills Profile + Symptoms.</li>
            <li>Book an appointment from the patient dashboard, or staff can book via <Link to="/appointments/book" className="text-primary-600 hover:underline">Book Appointment</Link>.</li>
          </ol>
          <p className="text-gray-500">
            Demo account: <strong>patient@careops.com</strong> (password set in Firebase Console).
          </p>
        </div>
      </div>
    </Layout>
  );
}
