export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-800">Payment Successful</h1>
          <p className="text-gray-500 mt-2 text-sm">Your payment has been received.</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <p className="text-sm text-green-700 font-medium">
            Thank you for your payment. Please collect your medicines from Counter 2.
          </p>
        </div>

        <p className="text-xs text-gray-400">CareOps AI — Hospital Workflow Automation</p>
      </div>
    </div>
  );
}
