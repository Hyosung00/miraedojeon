import { useTheme } from '@mui/material/styles';
import { Stack, Typography } from '@mui/material';
import addLogo from 'assets/images/Sejong.png'; // 실제 로고 경로

export default function LogoMain() {
  const theme = useTheme();

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <img
        src={addLogo}
        alt="Agency for Defense Development"
        width="70"
        height="30"
        style={{ objectFit: 'contain' }}
      />
      <Typography variant="h5" color="textPrimary" fontWeight={550}>
        세종대학교
      </Typography>
    </Stack>
  );
}
