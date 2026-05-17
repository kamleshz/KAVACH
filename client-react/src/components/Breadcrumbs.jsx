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
  const clientNameFromState =
    location.state?.clientName ||
    location.state?.breadcrumbLabel ||
    location.state?.context?.clientName ||
    '';

  // If we are just on dashboard, don't show breadcrumbs or just show Home
  if (pathnames.length === 0) return null;
  if (pathnames.length === 1 && pathnames[0] === 'dashboard') return null;

  return (
    <nav className="theme-text-secondary mb-4 flex items-center text-sm animate-fadeIn">
      <Link 
        to="/dashboard" 
        className="flex items-center transition-colors hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
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
            if ((prev === 'client' || prev === 'view-client') && clientNameFromState) {
              displayName = clientNameFromState;
            }
            else if (prev === 'client' || prev === 'view-client') displayName = 'Client Details';
            else if (prev === 'process-plant' || prev === 'process-ewaste') displayName = 'Audit Step';
            else displayName = 'Details';
        }

        // Handle specific parent contexts
        if (value === 'client' && !isId) return null; // Skip 'client' segment if it's just a prefix for ID

        const isLast = index === pathnames.length - 1;

        return (
          <div key={to} className="flex items-center">
            <RightOutlined className="theme-text-muted mx-2 text-[10px]" />
            {isLast ? (
              <span
                className="theme-text-primary rounded-md px-2 py-0.5 font-medium"
                style={{ background: 'var(--app-bg-muted)' }}
              >
                {displayName}
              </span>
            ) : (
              <Link 
                to={to} 
                className="theme-text-secondary transition-colors hover:underline underline-offset-4"
                style={{ textDecorationColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}
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
