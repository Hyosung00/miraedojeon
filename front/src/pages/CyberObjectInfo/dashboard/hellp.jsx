<Card 
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Grid container spacing={1.5} sx={{ height: 250 }}>
              {/* 사이버 작전 통계 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1.5,
                    height: '260px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📈 사이버 작전 통계
                  </Typography>
                  <Stack direction="row" sx={{ alignItems: 'center', mb: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('monthly');
                      }}
                      color={view === 'monthly' ? 'primary' : 'secondary'}
                      variant={view === 'monthly' ? 'outlined' : 'text'}
                    >
                      Month
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('weekly');
                      }}
                      color={view === 'weekly' ? 'primary' : 'secondary'}
                      variant={view === 'weekly' ? 'outlined' : 'text'}
                    >
                      Week
                    </Button>
                  </Stack>
                  <Box sx={{ height: '100%' }} onClick={(e) => e.stopPropagation()}>
                    <CyberOperationChart view={view} />
                  </Box>
                </Box>
              </Grid>

              {/* 보안 분석 리포트 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📋 보안 분석 리포트
                  </Typography>
                  <Box onClick={(e) => e.stopPropagation()}>
                    <List sx={{ p: 0, '& .MuiListItemButton-root': { py: 0, minHeight: 24 } }}>
                      <ListItemButton divider>
                        <ListItemText primary="시스템 보안 강화율" />
                        <Typography variant="h6" color="success.main">+45.14%</Typography>
                      </ListItemButton>
                      <ListItemButton divider>
                        <ListItemText primary="취약점 발견율" />
                        <Typography variant="h6" color="warning.main">0.58%</Typography>
                      </ListItemButton>
                      <ListItemButton>
                        <ListItemText primary="전체 보안 위험도" />
                        <Typography variant="h6" color="success.main">Low</Typography>
                      </ListItemButton>
                    </List>
                    <ReportAreaChart />
                  </Box>
                </Box>
              </Grid>
              {/* 실시간 네트워크 통계 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📊 실시간 네트워크 통계
                  </Typography>
                  <Grid container spacing={0.5} onClick={(e) => e.stopPropagation()}>
                    {/* 왼쪽 - 푸른색 (primary) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 총 네트워크 공격</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">2,236</Typography>
                      </Box>
                    </Grid>
                    {/* 오른쪽 - 노란색 (warning) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'warning.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 외부 네트워크 정보</Typography>
                        <Typography variant="h4" color="warning.main" fontWeight="bold">800</Typography>
                      </Box>
                    </Grid>
                    {/* 왼쪽 - 푸른색 (primary) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 북한 네트워크 공격</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">20</Typography>
                      </Box>
                    </Grid>
                    {/* 오른쪽 - 노란색 (warning) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'warning.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 내부 네트워크 정보</Typography>
                        <Typography variant="h4" color="warning.main" fontWeight="bold">1,278</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>