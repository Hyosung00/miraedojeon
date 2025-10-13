
import { lazy } from 'react';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard/default')));

// ActiveResponse
const ResponseEffectVisualization = Loadable(lazy(() => import('pages/ActiveResponse/ResponseEffectVisualization/index')));
const ThreatAnalysis = Loadable(lazy(() => import('pages/ActiveResponse/ThreatAnalysis/index')));

// CyberObjectInfo
const CyberDashboard = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard/default')));
const CyberMultilayer = Loadable(lazy(() => import('pages/CyberObjectInfo/Multilayer/MultilayerVisualization')));

// External & Internal
const TimeSeriesVisualization = Loadable(lazy(() => import('pages/External&Internal/TimeSeriesVisualization')));

// IntelligentCyberTargets
const TargetDashboard = Loadable(lazy(() => import('pages/IntelligentCyberTargets/target/TargetDashboard')));
const TargetIdentification = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetIdentification/index')));
const TargetPrioity = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetPrioity/index')));

// Osint & Data Fusion
const GeoIP = Loadable(lazy(() => import('pages/Osint&DataFusion/OsintInfocollect/GeoIP')));
const FusionDB = Loadable(lazy(() => import('pages/Osint&DataFusion/FusionDB/index')));

// Extra Pages
const SamplePage = Loadable(lazy(() => import('pages/extra-pages/sample-page')));

const MainRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    { path: '/', element: <DashboardDefault /> },
    {
  path: 'dashboard',
      children: [
  { path: 'default', element: <DashboardDefault /> },
  { path: 'cyber', element: <CyberDashboard /> },
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
  path: 'external-network',
      children: [
  { path: 'TimeSeriesVisualization', element: <TimeSeriesVisualization /> }
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
  path: 'Osint&Data Fusion',
      children: [
  { path: 'GeoIP', element: <GeoIP /> },
  { path: 'FusionDB', element: <FusionDB /> }
      ]
    },
    {
  path: 'extra-pages',
      children: [
  { path: 'sample-page', element: <SamplePage /> }
      ]
    }
  ]
};

export default MainRoutes;

