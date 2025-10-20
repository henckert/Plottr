import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center py-20">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Plottr</h2>
        <p className="text-xl text-gray-600 mb-8">
          Plan and visualize field layouts for sports, events, and more
        </p>
        <p className="text-sm text-gray-500 mb-8">(Development Mode - Authentication Disabled)</p>
      </div>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <p className="text-gray-600 mb-6">Explore the features below</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/app/layouts"
            className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Layouts</h3>
            <p className="text-gray-600">Create and manage your field layouts</p>
          </Link>
          <Link
            href="/app/templates"
            className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Templates</h3>
            <p className="text-gray-600">Browse and use layout templates</p>
          </Link>
          <Link
            href="/test"
            className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Page</h3>
            <p className="text-gray-600">View system status and configuration</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
