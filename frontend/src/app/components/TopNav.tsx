import { Link, useLocation } from 'react-router';
import { ChevronDown, User } from 'lucide-react';

export function TopNav() {
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/canvas', label: 'Canvas' },
    { path: '/reports', label: 'Reports' },
    { path: '/upload', label: 'Upload' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="h-14 bg-[#00274C] text-white flex items-center px-6 sticky top-0 z-50">
      <Link to="/" className="text-lg font-semibold tracking-tight mr-12">
        PreReq
      </Link>

      <div className="flex items-center gap-8 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`relative py-4 transition-colors ${
              isActive(link.path) ? 'text-white' : 'text-white/80 hover:text-white'
            }`}
          >
            {link.label}
            {isActive(link.path) && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFCB05]" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 transition-colors">
          <span className="text-sm">EECS 280</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        <div className="w-8 h-8 rounded-full bg-[#FFCB05] flex items-center justify-center text-[#00274C]">
          <User className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
}
