import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  User,
  Heart,
  Calendar,
  FileText,
  Upload,
  File,
} from 'lucide-react';
import client from '../api/client';
import Layout from '../components/Layout';

const SECTIONS = ['Profile', 'Symptoms & Allergies', 'Appointment', 'Lab Reports'];

const TAB_LABELS = {
  Profile: 'Profile',
  'Symptoms & Allergies': 'Symptoms & Allergies',
  Appointment: 'Appointments',
  'Lab Reports': 'Lab Reports',
};

const TAB_ICONS = {
  Profile: User,
  'Symptoms & Allergies': Heart,
  Appointment: Calendar,
  'Lab Reports': FileText,
};

function splitAllergiesToPills(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('Profile');
  const appointmentsPanelRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    age: '',
    area: '',
    phone: '',
    symptoms: '',
    allergies: '',
    conditions: '',
    appointmentDate: '',
  });

  const [labReports, setLabReports] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const fileInputRef = useRef(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [apptForm, setApptForm] = useState({ doctorId: '', scheduledAt: '', apptSymptoms: '' });
  const [apptLoading, setApptLoading] = useState(false);
  const [apptStatus, setApptStatus] = useState('');
  const [apptError, setApptError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await client.get('/api/patients/profile');
        setForm({
          name: data.name || '',
          age: data.age || '',
          area: data.area || '',
          phone: data.phone || '',
          symptoms: data.symptoms || '',
          allergies: data.allergies || '',
          conditions: data.conditions || '',
          appointmentDate: data.appointmentDate || '',
        });
        setLabReports(data.labReports || []);
      } catch {
        // no profile yet
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

  function goToAppointmentsTab() {
    setActiveSection('Appointment');
    setTimeout(() => {
      appointmentsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  useEffect(() => {
    if (activeSection !== 'Appointment') return;

    async function loadApptData() {
      setDoctorsLoading(true);
      try {
        const [profileRes, doctorsRes] = await Promise.all([
          client.get('/api/patients/profile'),
          client.get('/api/doctors'),
        ]);
        setProfileReady(!!(profileRes.data?.name && String(profileRes.data?.phone || '').trim()));
        setDoctors(doctorsRes.data?.doctors || []);
      } catch {
        setProfileReady(false);
      } finally {
        setDoctorsLoading(false);
      }
    }

    loadApptData();
  }, [activeSection]);

  async function handleApptSubmit(e) {
    e.preventDefault();
    setApptStatus('');
    setApptError('');

    if (!apptForm.doctorId) return setApptError('Please select a doctor.');
    if (!apptForm.scheduledAt) return setApptError('Please select a date and time.');
    if (!apptForm.apptSymptoms || apptForm.apptSymptoms.trim().length < 10) {
      return setApptError('Please describe your symptoms (minimum 10 characters).');
    }

    setApptLoading(true);
    try {
      const { data: patient } = await client.get('/api/patients/profile');
      if (!String(patient.phone || '').trim()) {
        setApptLoading(false);
        return setApptError('Add your phone number under Profile and save, then book again.');
      }
      const selectedDoctor = doctors.find((d) => d.id === apptForm.doctorId);

      await client.post('/api/appointments/book', {
        patientId: patient.uid || '',
        patientName: patient.name || '',
        patientPhone: patient.phone || '',
        patientArea: patient.area || '',
        doctorId: selectedDoctor?.uid || apptForm.doctorId,
        doctorName: selectedDoctor?.name || '',
        scheduledAt: apptForm.scheduledAt,
        symptoms: apptForm.apptSymptoms.trim(),
      });

      setApptStatus('Appointment booked successfully. Doctor will confirm shortly.');
      setApptForm({ doctorId: '', scheduledAt: '', apptSymptoms: '' });
    } catch (err) {
      setApptError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setApptLoading(false);
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
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const allergyPills = splitAllergiesToPills(form.allergies);
  const hasAppointmentDate = Boolean(String(form.appointmentDate || '').trim());

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {form.name || user?.email}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your health profile and appointments</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {SECTIONS.map((s) => {
            const Icon = TAB_ICONS[s];
            const active = activeSection === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition border ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {TAB_LABELS[s] || s}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSaveProfile}>
          {activeSection === 'Profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left — Personal Information */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                    <input
                      type="number"
                      name="age"
                      value={form.age}
                      onChange={handleChange}
                      placeholder="Enter your age"
                      min="1"
                      max="120"
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit number or +91xxxxxxxxxx"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      WhatsApp: save a real number for pharmacy notifications (Twilio sandbox: join the sandbox first).
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
                    <input
                      type="text"
                      name="area"
                      value={form.area}
                      onChange={handleChange}
                      placeholder="e.g. Koramangala, Bangalore"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <SaveBar status={saveStatus} error={saveError} submitLabel="Save Changes" fullWidth />
                </div>
              </div>

              {/* Right — stacked cards */}
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Allergies and Conditions</h2>
                  {allergyPills.length === 0 ? (
                    <p className="text-sm text-gray-500">No allergies recorded. Add them under Symptoms &amp; Allergies.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allergyPills.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 border border-primary-100"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-xs text-gray-500">Reviewed by Dr. Sharma</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointment</h2>
                  {!hasAppointmentDate ? (
                    <p className="text-sm text-gray-500 mb-4">No upcoming appointment</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      <p className="text-base font-semibold text-gray-900">{form.appointmentDate}</p>
                      <p className="text-xs text-gray-500">From your profile</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={goToAppointmentsTab}
                    className="w-full rounded-lg border-2 border-primary-600 bg-white py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 transition"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Symptoms & Allergies' && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Symptoms and Allergies</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Symptoms</label>
                  <textarea
                    name="symptoms"
                    value={form.symptoms}
                    onChange={handleChange}
                    placeholder="Describe your current symptoms (e.g. fever, headache, cough)"
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical conditions</label>
                  <textarea
                    name="conditions"
                    value={form.conditions}
                    onChange={handleChange}
                    placeholder="e.g. diabetes, hypertension"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Known Allergies</label>
                  <textarea
                    name="allergies"
                    value={form.allergies}
                    onChange={handleChange}
                    placeholder="List any known allergies (e.g. penicillin, peanuts, dust)"
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                  />
                </div>
                <SaveBar status={saveStatus} error={saveError} submitLabel="Save" />
              </div>
            </div>
          )}
        </form>

        {activeSection === 'Appointment' && (
          <div ref={appointmentsPanelRef} className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Book an Appointment</h2>
              <p className="text-sm text-gray-500 mb-6">Schedule a visit with a doctor</p>

              {doctorsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !profileReady ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Open <strong>Profile</strong>, enter <strong>name</strong>, <strong>age</strong>, and <strong>phone number</strong>, then save.
                </div>
              ) : (
                <form onSubmit={handleApptSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor *</label>
                    <select
                      value={apptForm.doctorId}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, doctorId: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; time *</label>
                    <input
                      type="datetime-local"
                      value={apptForm.scheduledAt}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms *</label>
                    <textarea
                      value={apptForm.apptSymptoms}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, apptSymptoms: e.target.value }))}
                      placeholder="Describe your symptoms (minimum 10 characters)"
                      rows={4}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                    />
                  </div>
                  {apptStatus && (
                    <p className="text-sm text-medical-green bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      {apptStatus}
                    </p>
                  )}
                  {apptError && (
                    <p className="text-sm text-medical-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {apptError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={apptLoading}
                    className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {apptLoading ? 'Booking…' : 'Book Appointment'}
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center">
              <p className="text-sm text-gray-500">No past bookings yet</p>
            </div>
          </div>
        )}

        {activeSection === 'Lab Reports' && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lab Reports</h2>
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" strokeWidth={1.5} aria-hidden />
              <p className="text-sm text-gray-600 mb-1">Upload PDF, JPG or PNG — max 10MB</p>
              <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition">
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
              <p className="mt-4 text-sm text-medical-green bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {uploadStatus}
              </p>
            )}
            {uploadError && (
              <p className="mt-4 text-sm text-medical-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}
            {labReports.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No lab reports uploaded yet.</p>
            ) : (
              <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-100">
                {labReports.map((report, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <File className="h-5 w-5 shrink-0 text-gray-400 mt-0.5" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{report.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.uploadedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary-600 hover:underline shrink-0"
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
    </Layout>
  );
}

function SaveBar({ status, error, submitLabel = 'Save', fullWidth = false }) {
  return (
    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="submit"
        className={`rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        {submitLabel}
      </button>
      {status && <span className="text-sm text-medical-green">{status}</span>}
      {error && <span className="text-sm text-medical-red">{error}</span>}
    </div>
  );
}
