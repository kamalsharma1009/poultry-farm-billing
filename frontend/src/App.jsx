
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Payment restriction screen
function PaymentPending() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">

        <div className="text-5xl mb-5">🔒</div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Application Temporarily Suspended
        </h1>

        <p className="text-gray-600 mb-5">
          Access to this application has been temporarily
          suspended due to an outstanding payment.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
          <p className="text-yellow-800 text-sm">
            Please contact the service provider to clear
            the pending payment and restore access.
          </p>
        </div>

        <p className="text-sm text-gray-400">
          We apologize for the inconvenience.
        </p>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<PaymentPending />} />
      </Routes>
    </Router>
  );
}
