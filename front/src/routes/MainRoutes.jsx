
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));

// Osint & Data Fusion
const GeoIP = Loadable(lazy(() => import('pages/Osint&DataFusion/OsintInfocollect')));
const FusionDB = Loadable(lazy(() => import('pages/Osint&DataFusion/FusionDB')));

// CyberObjectInfo
const CyberDashboard = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));
const CyberMultilayer = Loadable(lazy(() => import('pages/CyberObjectInfo/Multilayer')));

// External & Internal
const TimeSeriesVisualization = Loadable(lazy(() => import('pages/ExtInt/TimeSeriesVisualization')));
const InternalNetwork = Loadable(lazy(() => import('pages/ExtInt/Internal')));
const ExternalNetwork = Loadable(lazy(() => import('pages/ExtInt/External')));

// IntelligentCyberTargets
const TargetDashboard = Loadable(lazy(() => import('pages/IntelligentCyberTargets/target')));
const TargetIdentification = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetIdentification')));
const TargetPrioity = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetPrioity')));

// ActiveResponse
const ResponseEffectVisualization = Loadable(lazy(() => import('pages/ActiveResponse/ResponseEffectVisualization')));
const ThreatAnalysis = Loadable(lazy(() => import('pages/ActiveResponse/ThreatAnalysis')));


const MainRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    { path: '/', element: <Navigate to="/dashboard/default" replace /> },
    { path: '/dashboard/default', element: <DashboardDefault /> },
    {
      path: 'dashboard',
      children: [
        { path: 'default', element: <CyberDashboard /> }
      ]
    },
    {
      path: 'CyberObjectInfo',
      children: [
        { path: 'MultilayerVisualization', element: <CyberMultilayer /> }
      ]
    },
    {
      path: 'ActiveResponse',
      children: [
        { path: 'responseeffectvisualization', element: <ResponseEffectVisualization /> },
        { path: 'threatanalysis', element: <ThreatAnalysis /> }
      ]
    },
    {
      path: 'ExtInt',
      children: [
        { path: 'TimeSeriesVisualization', element: <TimeSeriesVisualization /> },
        { path: 'internaltopology', element: <InternalNetwork /> },
        { path: 'externaltopology', element: <ExternalNetwork /> }
      ]
    },
    {
      path: 'target',
      children: [
        { path: 'targetDashboard', element: <TargetDashboard /> },
        { path: 'targetIdentification', element: <TargetIdentification /> },
        { path: 'priorityVisualization', element: <TargetPrioity /> }
      ]
    },
    {
      path: 'Osint&DataFusion',
      children: [
        { path: 'GeoIP', element: <GeoIP /> },
        { path: 'FusionDB', element: <FusionDB /> }
      ]
    }
  ]
};

export default MainRoutes;

