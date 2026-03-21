import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Upload, FileText, Sparkles, Download, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/suggestions', label: 'AI Suggestions', icon: Sparkles },
    { path: '/canvas', label: 'Canvas', icon: MessageSquare },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`bg-[#F1F5F9] border-r border-[#E2E8F0] transition-all duration-300 flex flex-col ${isCollapsed ? 'w-14' : 'w-60'}`}>
      <div className="flex-1 py-6">
        <div className="px-4 mb-6">
          <div className={`text-xs font-medium text-[#94A3B8] mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            COURSE
          </div>
          <select className={`w-full px-3 py-2 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C] bg-white ${isCollapsed ? 'hidden' : 'block'}`}>
            <option>EECS 280</option>
            <option>EECS 281</option>
          </select>
        </div>

        <div className="px-4 mb-6">
          <div className={`text-xs font-medium text-[#94A3B8] mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            EXAM
          </div>
          <select className={`w-full px-3 py-2 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C] bg-white ${isCollapsed ? 'hidden' : 'block'}`}>
            <option>Midterm 1</option>
            <option>Midterm 2</option>
            <option>Final</option>
          </select>
        </div>

        <div className={`text-xs font-medium text-[#94A3B8] px-4 mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          QUICK LINKS
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  active
                    ? 'bg-[#FFF8E1] text-[#00274C]'
                    : 'text-[#4A5568] hover:bg-[#E8EEF4]'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 border-t border-[#E2E8F0] hover:bg-[#E8EEF4] transition-colors flex items-center justify-center"
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-[#4A5568]" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-[#4A5568]" />
        )}
      </button>
    </div>
  );
}
