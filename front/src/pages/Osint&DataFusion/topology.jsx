import React, { memo } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

// ==============================|| INTERNAL NETWORK TOPOLOGY PAGE ||============================== //

const InternalTopologyPage = memo(() => {
  return (
    <Card sx={{
      width: '100%',
      height: 'calc(90vh)',
      bgcolor: 'background.paper',
      boxShadow: 3,
      m: 2
    }}>
      <CardContent sx={{
        p: 3,
        height: '100%',
        '&:last-child': { pb: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <Typography variant="h3" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          내부망 토폴로지
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4 }}>
          개발 예정
        </Typography>
        <Box sx={{
          p: 4,
          bgcolor: 'grey.100',
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'grey.300',
          minWidth: 300
        }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            내부망 네트워크 토폴로지 시각화 기능이<br/>
            곧 제공될 예정입니다.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
});

InternalTopologyPage.displayName = 'InternalTopologyPage';

export default InternalTopologyPage;