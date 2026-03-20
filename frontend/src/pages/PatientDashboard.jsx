import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import client from '../api/client';
import Navbar from '../components/Navbar';

const SECTIONS = ['Profile', 'Symptoms & Allergies', 'Appointment', 'Lab Reports'];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('Profile');

  const [form, setForm] = useState({
    name: '',
    age: '',
    area: '',
    symptoms: '',
    allergies: '',
    appointmentDate: '',
  });

  const [labReports, setLabReports] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await client.get('/api/patients/profile');
        setForm({
          name: data.name || '',
          age: data.age || '',
          area: data.area || '',
          symptoms: data.symptoms || '',
          allergies: data.allergies || '',
          appointmentDate: data.appointmentDate || '',
        });
        setLabReports(data.labReports || []);
      } catch {
        // no profile yet — keep empty form
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaveStatus('');
    setSaveError('');

    try {
      await client.post('/api/patients/profile', form);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus('Uploading…');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await client.post('/api/patients/lab-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLabReports((prev) => [...prev, data.report]);
      setUploadStatus('Uploaded successfully!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Only PDF, JPG, PNG allowed (max 10MB).');
      setUploadStatus('');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (profileLoading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {form.name || user?.email}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your health profile and appointments</p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeSection === s
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 border hover:bg-blue-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveProfile}>
          {/* ── PROFILE SECTION ── */}
          {activeSection === 'Profile' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Personal Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Enter your age"
                  min="1"
                  max="120"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Area / Location</label>
                <input
                  type="text"
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  placeholder="e.g. Koramangala, Bangalore"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <SaveBar status={saveStatus} error={saveError} />
            </div>
          )}

          {/* ── SYMPTOMS & ALLERGIES SECTION ── */}
          {activeSection === 'Symptoms & Allergies' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Symptoms &amp; Allergies</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Current Symptoms</label>
                <textarea
                  name="symptoms"
                  value={form.symptoms}
                  onChange={handleChange}
                  placeholder="Describe your current symptoms (e.g. fever, headache, cough)"
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Known Allergies</label>
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                  placeholder="List any known allergies (e.g. penicillin, peanuts, dust)"
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <SaveBar status={saveStatus} error={saveError} />
            </div>
          )}

          {/* ── APPOINTMENT SECTION ── */}
          {activeSection === 'Appointment' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Book Appointment</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Preferred Appointment Date</label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={form.appointmentDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {form.appointmentDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                  Appointment requested for:{' '}
                  <strong>
                    {new Date(form.appointmentDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </div>
              )}

              <SaveBar status={saveStatus} error={saveError} />
            </div>
          )}
        </form>

        {/* ── LAB REPORTS SECTION ── */}
        {activeSection === 'Lab Reports' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Lab Reports</h2>

            {/* Upload area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <p className="text-gray-500 text-sm mb-3">Upload PDF, JPG, or PNG (max 10 MB)</p>
              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                Choose File
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
              </label>
            </div>

            {uploadStatus && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                {uploadStatus}
              </p>
            )}
            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {uploadError}
              </p>
            )}

            {/* Reports list */}
            {labReports.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No lab reports uploaded yet.</p>
            ) : (
              <ul className="divide-y">
                {labReports.map((report, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{report.name}</p>
                      <p className="text-xs text-gray-400">
                        Uploaded:{' '}
                        {new Date(report.uploadedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-medium hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveBar({ status, error }) {
  return (
    <div className="pt-2 flex items-center gap-3">
      <button
        type="submit"
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
      >
        Save
      </button>
      {status && <span className="text-sm text-green-600">{status}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
