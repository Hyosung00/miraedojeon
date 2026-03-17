
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));

// Osint & Data Fusion
const GeoIP = Loadable(lazy(() => import('../pages/OsintDataFusion/OsintInfocollect')));
const FusionDB = Loadable(lazy(() => import('../pages/OsintDataFusion/FusionDB')));
const PDR = Loadable(lazy(() => import('pages/CyberObjectInfo/PDR/PDR')));

// CyberObjectInfo
const CyberDashboard = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard')));
const CyberMultilayer = Loadable(lazy(() => import('pages/CyberObjectInfo/Multilayer')));

// External & Internal
const TimeSeriesVisualization = Loadable(lazy(() => import('pages/ExtInt/TimeSeriesVisualization')));
const NetworkDataFusion = Loadable(lazy(() => import('pages/ExtInt/NetworkDataFusion')));
const InternalNetwork = Loadable(lazy(() => import('pages/ExtInt/Internal/internaltopology')));
const ExternalTopology = Loadable(lazy(() => import('pages/ExtInt/Internal/externaltopology')));

// IntelligentCyberTargets
const TargetDashboard = Loadable(lazy(() => import('pages/IntelligentCyberTargets/target')));
const TargetIdentification = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetIdentification')));

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
        { path: 'MultilayerVisualization', element: <CyberMultilayer /> },
        { path: 'PDR', element: <PDR /> }
      ]
    },
    {
      path: 'ActiveResponse',
      children: [
        { path: 'responseeffectvisualization', element: <ResponseEffectVisualization /> },
        { path: 'ThreatAnalysis', element: <ThreatAnalysis /> }
      ]
    },
    {
      path: 'ExtInt',
      children: [
        { path: 'TimeSeriesVisualization', element: <TimeSeriesVisualization /> },
        { path: 'NetworkDataFusion', element: <NetworkDataFusion /> },
        { path: 'internaltopology', element: <InternalNetwork /> },
        { path: 'externaltopology', element: <ExternalTopology /> }
      ]
    },
    {
      path: 'target',
      children: [
        { path: 'targetDashboard', element: <TargetDashboard /> },
        { path: 'TargetIdentification', element: <TargetIdentification /> }
      ]
    },
    {
      path: 'OsintDataFusion',
      children: [
        { path: 'GeoIP', element: <GeoIP /> },
        { path: 'FusionDB', element: <FusionDB /> }
      ]
    }
  ]
};

export default MainRoutes;

