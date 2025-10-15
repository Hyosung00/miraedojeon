
import { lazy } from 'react';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard/default')));

// Osint & Data Fusion
const GeoIP = Loadable(lazy(() => import('pages/Osint&DataFusion/OsintInfocollect/GeoIP')));
const FusionDB = Loadable(lazy(() => import('pages/Osint&DataFusion/FusionDB/index')));

// CyberObjectInfo
const CyberDashboard = Loadable(lazy(() => import('pages/CyberObjectInfo/dashboard/default')));
const CyberMultilayer = Loadable(lazy(() => import('pages/CyberObjectInfo/Multilayer/MultilayerVisualization')));

// External & Internal
const TimeSeriesVisualization = Loadable(lazy(() => import('pages/ExtInt/TimeSeriesVisualization')));
const InternalNetwork = Loadable(lazy(() => import('pages/ExtInt/Internal/internaltopology')));
const ExternalNetwork = Loadable(lazy(() => import('pages/ExtInt/External/externaltopology')));

// IntelligentCyberTargets
const TargetDashboard = Loadable(lazy(() => import('pages/IntelligentCyberTargets/target/TargetDashboard')));
const TargetIdentification = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetIdentification/index')));
const TargetPrioity = Loadable(lazy(() => import('pages/IntelligentCyberTargets/TargetPrioity/index')));

// ActiveResponse
const ResponseEffectVisualization = Loadable(lazy(() => import('pages/ActiveResponse/ResponseEffectVisualization/index')));
const ThreatAnalysis = Loadable(lazy(() => import('pages/ActiveResponse/ThreatAnalysis/index')));


const MainRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    { path: '/', element: <DashboardDefault /> },
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

