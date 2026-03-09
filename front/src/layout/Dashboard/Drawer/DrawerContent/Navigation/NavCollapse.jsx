import PropTypes from 'prop-types';

// material-ui
import List from '@mui/material/List';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// project import
import NavItem from './NavItem';
import { useGetMenuMaster } from 'api/menu';
import { useNavigate } from 'react-router-dom';

// ==============================|| NAVIGATION - COLLAPSE ||============================== //

export default function NavCollapse({ item, level }) {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const navigate = useNavigate();

  const textColor = 'text.primary';

  const navItems = item.children?.map((menuItem) => {
    switch (menuItem.type) {
      case 'item':
        // 메뉴가 닫혀있을 때는 level 1로 전달하여 아이콘만 표시
        return <NavItem key={menuItem.id} item={menuItem} level={drawerOpen ? level + 1 : 1} />;
      case 'collapse':
        return <NavCollapse key={menuItem.id} item={menuItem} level={drawerOpen ? level + 1 : 1} />;
      default:
        return (
          <Typography key={menuItem.id} variant="h6" color="error" align="center">
            Fix - Collapse or Items
          </Typography>
        );
    }
  });

  // 메뉴가 닫혀있을 때는 하위 아이템들만 직접 표시
  if (!drawerOpen) {
    return (
      <List component="div" disablePadding>
        {navItems}
      </List>
    );
  }

  // 메뉴가 열려있을 때는 제목과 하위 아이템들 모두 표시 (접기/펼치기 없음)
  return (
    <>
      <Box sx={{ pl: `${level * 28}px`, py: 1.25 }}>
        <Typography
          variant="h5"
          sx={{
            color: textColor,
            fontWeight: 600,
            fontSize: 'var(--nav-collapse-font-size, 1.1rem)',
            cursor: item.url ? 'pointer' : 'default',
            '&:hover': item.url ? { color: 'primary.main', textDecoration: 'underline' } : {}
          }}
          onClick={() => item.url && navigate(item.url)}
        >
          {item.title}
        </Typography>
      </Box>
      <List component="div" disablePadding>
        {navItems}
      </List>
    </>
  );
}

NavCollapse.propTypes = {
  item: PropTypes.object,
  level: PropTypes.number
};
