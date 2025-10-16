import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import headerTitles from './headerTitles';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import InfoOutlined from '@ant-design/icons/InfoOutlined';

// project imports
import AppBarStyled from './AppBarStyled';
import HeaderContent from './HeaderContent';
import IconButton from 'components/@extended/IconButton';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from 'config';

// assets
import MenuFoldOutlined from '@ant-design/icons/MenuFoldOutlined';
import MenuUnfoldOutlined from '@ant-design/icons/MenuUnfoldOutlined';

// ==============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const [showIconCredits, setShowIconCredits] = useState(false);

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  // header content
  const headerContent = useMemo(() => <HeaderContent />, []);

  // 현재 라우트에 따라 헤더 타이틀 결정
  const location = useLocation();
  const title = headerTitles[location.pathname] || "-";
  
  // targetDashboard 페이지인지 확인
  const isTargetDashboard = location.pathname === "/target/targetDashboard";

  // common header
  const mainHeader = (
    <Toolbar>
      <IconButton
        aria-label="open drawer"
        onClick={() => handlerDrawerOpen(!drawerOpen)}
        edge="start"
        color="secondary"
        variant="light"
        sx={(theme) => ({
          color: 'text.primary',
          bgcolor: drawerOpen ? 'transparent' : 'grey.100',
          ...theme.applyStyles('dark', { bgcolor: drawerOpen ? 'transparent' : 'background.default' }),
          ml: { xs: 0, lg: -2 }
        })}
      >
        {!drawerOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </IconButton>
      <span style={{ fontWeight: 400, fontSize: 20, color: '#39306b', marginLeft: 24 }}>
        {title}
      </span>
      {headerContent}
      
      {/* targetDashboard 페이지일 때만 i 아이콘 표시 */}
      {isTargetDashboard && (
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <IconButton
            aria-label="icon credits"
            onClick={() => setShowIconCredits(!showIconCredits)}
            color="secondary"
            variant="light"
            sx={{
              bgcolor: '#39306b',
              color: 'white',
              '&:hover': { bgcolor: '#4a3d7a' },
              width: 36,
              height: 36
            }}
          >
            <InfoOutlined style={{ fontSize: 20 }} />
          </IconButton>
          
          {/* 아이콘 출처 정보 모달 */}
          {showIconCredits && (
            <div
              style={{
                position: 'absolute',
                top: '45px',
                right: '0',
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1300,
                minWidth: '400px',
                maxHeight: '70vh',
                overflowY: 'auto'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#39306b' }}>
                아이콘 출처
              </h3>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <p><strong>Switch:</strong> <a href="https://www.flaticon.com/free-icons/hub" title="hub icons" target="_blank" rel="noopener noreferrer">Hub icons created by Freepik - Flaticon</a></p>
                <p><strong>Server:</strong> <a href="https://www.flaticon.com/free-icons/server" title="server icons" target="_blank" rel="noopener noreferrer">Server icons created by Those Icons - Flaticon</a></p>
                <p><strong>PLC:</strong> <a href="https://www.flaticon.com/free-icons/plc" title="plc icons" target="_blank" rel="noopener noreferrer">Plc icons created by Freepik - Flaticon</a></p>
                <p><strong>Laptop:</strong> <a href="https://www.flaticon.com/free-icons/technology" title="technology icons" target="_blank" rel="noopener noreferrer">Technology icons created by Liyuza - Flaticon</a></p>
                <p><strong>Workstation:</strong> <a href="https://www.flaticon.com/free-icons/workstation" title="workstation icons" target="_blank" rel="noopener noreferrer">Workstation icons created by Design Circle - Flaticon</a></p>
                <p><strong>Router:</strong> <a href="https://www.flaticon.com/free-icons/wireless-router" title="wireless router icons" target="_blank" rel="noopener noreferrer">Wireless router icons created by Freepik - Flaticon</a></p>
                <p><strong>Firewall:</strong> <a href="https://www.flaticon.com/free-icons/firewall" title="firewall icons" target="_blank" rel="noopener noreferrer">Firewall icons created by juicy_fish - Flaticon</a></p>
                <p><strong>Printer:</strong> <a href="https://www.flaticon.com/free-icons/printer" title="printer icons" target="_blank" rel="noopener noreferrer">Printer icons created by Freepik - Flaticon</a></p>
                <p><strong>Sensor:</strong> <a href="https://www.flaticon.com/free-icons/motion-sensor" title="motion sensor icons" target="_blank" rel="noopener noreferrer">Motion sensor icons created by Nuricon - Flaticon</a></p>
              </div>
            </div>
          )}
        </div>
      )}
    </Toolbar>
  );

  // app-bar params
  const appBar = {
    position: 'fixed',
    color: 'inherit',
    elevation: 0,
    sx: {
      borderBottom: '1px solid',
      borderBottomColor: 'divider',
      zIndex: 1200,
      width: { xs: '100%', lg: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : `calc(100% - ${MINI_DRAWER_WIDTH}px)` }
    }
  };

  return (
    <>
      {!downLG ? (
        <AppBarStyled open={drawerOpen} {...appBar}>
          {mainHeader}
        </AppBarStyled>
      ) : (
        <AppBar {...appBar}>{mainHeader}</AppBar>
      )}
    </>
  );
}
