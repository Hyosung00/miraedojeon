import PropTypes from 'prop-types';
// material-ui
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project import
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import { useGetMenuMaster } from 'api/menu';

export default function NavGroup({ item }) {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const navCollapse = item.children?.map((menuItem) => {
    switch (menuItem.type) {
      case 'collapse':
        return <NavCollapse key={menuItem.id} item={menuItem} level={1} />;
      case 'item':
        return <NavItem key={menuItem.id} item={menuItem} level={1} />;
      case 'group':
        return <NavGroup key={menuItem.id} item={menuItem} />;
      default:
        return (
          <Typography key={menuItem.id} variant="h6" color="textSecondary" align="center">
            Fix - Group Collapse or Items
          </Typography>
        );
    }
  });

  return (
    <List
      subheader={
        item.title &&
        drawerOpen && (
          <Box sx={{ pl: 3, mb: 1.5 }}>
            <Typography variant="h5" color="black" sx={{ fontWeight: 'bold', fontSize: 'var(--nav-group-font-size, 1.3rem)' }}>
              {item.title}
            </Typography>
          </Box>
        )
      }
      sx={{ mb: drawerOpen ? 5 : 0, py: 0, zIndex: 0 }} // 메뉴가 닫혀있을 때는 margin-bottom 제거, 각 메뉴 사이 간격 늘리기
    >
      {navCollapse}
    </List>
  );
}

NavGroup.propTypes = { item: PropTypes.object };
