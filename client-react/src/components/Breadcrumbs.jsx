import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined, RightOutlined } from '@ant-design/icons';

const routeNameMap = {
  'dashboard': 'Home',
  'clients': 'Client Management',
  'add-client': 'Add New Client',
  'group-search': 'Group Search',
  'profile': 'My Profile',
  'admin': 'Admin Panel',
  'companies': 'Company Management',
  'kpi': 'KPI Dashboard',
  'login-logs': 'Login Logs',
  'plastic': 'Plastic Waste',
  'ewaste': 'E-Waste',
  'process-plant': 'Plant Audit Process',
  'process-ewaste': 'E-Waste Audit Process',
  'validate': 'Validation',
  'edit': 'Edit Client',
  'audit': 'Audit Client'
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If we are just on dashboard, don't show breadcrumbs or just show Home
  if (pathnames.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center text-sm text-gray-500 animate-fadeIn">
      <Link 
        to="/dashboard" 
        className="flex items-center hover:text-orange-600 transition-colors"
      >
        <HomeOutlined className="mr-1" />
        <span>Home</span>
      </Link>
      
      {pathnames.map((value, index) => {
        // Skip 'dashboard' as it's handled by the Home icon above
        if (value === 'dashboard') return null;

        // Build the URL for this breadcrumb item
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        
        // Determine the display label
        let displayName = routeNameMap[value] || value;

        // Handle dynamic IDs (simple heuristic: if it contains numbers/mixed chars and is long, treat as ID)
        const isId = value.length > 10 && /\d/.test(value);
        if (isId) {
            // Check context from previous segment to give better name
            const prev = pathnames[index - 1];
            if (prev === 'client' || prev === 'view-client') displayName = 'Client Details';
            else if (prev === 'process-plant' || prev === 'process-ewaste') displayName = 'Audit Step';
            else displayName = 'Details';
        }

        // Handle specific parent contexts
        if (value === 'client' && !isId) return null; // Skip 'client' segment if it's just a prefix for ID

        const isLast = index === pathnames.length - 1;

        return (
          <div key={to} className="flex items-center">
            <RightOutlined className="mx-2 text-[10px] text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                {displayName}
              </span>
            ) : (
              <Link 
                to={to} 
                className="hover:text-orange-600 transition-colors hover:underline decoration-orange-600/30 underline-offset-4"
              >
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
