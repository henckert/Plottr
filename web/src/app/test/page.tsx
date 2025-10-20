export default function TestPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Page</h1>
      <p className="text-xl text-gray-600 mb-8">
        Frontend is working! ✅
      </p>
      <div className="space-y-4">
        <p><strong>Time:</strong> {new Date().toISOString()}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        <p><strong>API Base:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL}</p>
      </div>
    </div>
  );
}
