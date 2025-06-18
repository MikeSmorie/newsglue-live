// Scaffolded Sidebar
import { Link } from "wouter";
import { Zap, TrendingUp } from "lucide-react";

export default function SidebarNavigation() {
  return (
    <aside className="w-64 bg-gray-900 text-white">
      <nav className="p-4 space-y-2">
        {/* Featured Tools */}
        <div className="mb-4">
          <h3 className="text-xs uppercase text-gray-400 mb-2 px-2">Featured Tools</h3>
          <Link href="/newsjack" className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded bg-gradient-to-r from-blue-600 to-purple-600">
            <Zap className="h-4 w-4" />
            NewsJack Generator
          </Link>
        </div>
        
        {/* Modules */}
        <div>
          <h3 className="text-xs uppercase text-gray-400 mb-2 px-2">Modules</h3>
          <Link href="/module1" className="block p-2 hover:bg-gray-800 rounded">module1</Link>
          <Link href="/module2" className="block p-2 hover:bg-gray-800 rounded">module2</Link>
          <Link href="/module3" className="block p-2 hover:bg-gray-800 rounded">module3</Link>
          <Link href="/module4" className="block p-2 hover:bg-gray-800 rounded">module4</Link>
          <Link href="/module5" className="block p-2 hover:bg-gray-800 rounded">module5</Link>
          <Link href="/module6" className="block p-2 hover:bg-gray-800 rounded">module6</Link>
          <Link href="/module7" className="block p-2 hover:bg-gray-800 rounded">module7</Link>
          <Link href="/module8" className="block p-2 hover:bg-gray-800 rounded">module8</Link>
          <Link href="/module9" className="block p-2 hover:bg-gray-800 rounded">module9</Link>
          <Link href="/module10" className="block p-2 hover:bg-gray-800 rounded">module10</Link>
          <Link href="/salvage-drop" className="block p-2 hover:bg-gray-800 rounded">Salvaged Dropzone</Link>
        </div>
      </nav>
    </aside>
  );
}