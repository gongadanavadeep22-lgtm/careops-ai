import Layout from '../components/Layout';

export default function Demo() {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo</h1>
          <p className="mt-1 text-sm text-gray-500">Product walkthrough and sample workflows.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-gray-500">Coming soon.</p>
        </div>
      </div>
    </Layout>
  );
}
