
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));

// Osint & Data Fusion
const GeoIP = Loadable(lazy(() => import('pages/Osint&DataFusion/OsintInfocollect')));

// CyberObjectInfo
const CyberDashboard = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));
const CyberMultilayer = Loadable(lazy(() => import('pages/CyberObjectInfo/Multilayer')));

// External & Internal
const TimeSeriesVisualization = Loadable(lazy(() => import('pages/ExtInt/TimeSeriesVisualization')));
const InternalNetwork = Loadable(lazy(() => import('pages/ExtInt/Internal')));

// IntelligentCyberTargets
const TargetDashboard = Loadable(lazy(() => import('pages/IntelligentCyberTargets/target')));

// ActiveResponse
const ResponseEffectVisualization = Loadable(lazy(() => import('pages/ActiveResponse/ResponseEffectVisualization')));


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
        { path: 'responseeffectvisualization', element: <ResponseEffectVisualization /> }
      ]
    },
    {
      path: 'ExtInt',
      children: [
        { path: 'TimeSeriesVisualization', element: <TimeSeriesVisualization /> },
        { path: 'internaltopology', element: <InternalNetwork /> }
      ]
    },
    {
      path: 'target',
      children: [
        { path: 'targetDashboard', element: <TargetDashboard /> }
      ]
    },
    {
      path: 'Osint&DataFusion',
      children: [
        { path: 'GeoIP', element: <GeoIP /> }
      ]
    }
  ]
};

export default MainRoutes;

