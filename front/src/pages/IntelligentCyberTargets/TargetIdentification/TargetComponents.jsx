import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import {
  SyncOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  PartitionOutlined
} from '@ant-design/icons';

const formatCompact = (value) => String(value ?? '');

const pad = (num, size = 2) => String(num).padStart(size, '0');

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const parseLogItem = (item, index = 0) => ({
  id: item?.id ?? `log-${index}`,
  timestamp: item?.timestamp,
  level: item?.level ?? 'INFO ',
  message: item?.message ?? ''
});

export const KpiCard = ({ card }) => (
  <Box
    sx={{
      p: 1.1,
      borderRadius: 3,
      bgcolor: '#fff',
      border: '1px solid rgba(226,232,240,0.9)',
      boxShadow: '0 10px 24px rgba(15,23,42,0.04)'
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
      <Typography sx={{ fontSize: '0.71rem', color: '#64748b', fontWeight: 700 }}>
        {card.label}
      </Typography>
      <Box
        sx={{
          minWidth: 28,
          height: 20,
          px: 0.7,
          borderRadius: 999,
          border: `1px solid ${card.accent}`,
          color: card.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.64rem',
          fontWeight: 800
        }}
      >
        {formatCompact(card.value)}
      </Box>
    </Box>

    <Typography sx={{ fontSize: '1rem', color: '#111827', fontWeight: 800, lineHeight: 1.1 }}>
      {card.value}
    </Typography>
    <Typography sx={{ mt: 0.25, fontSize: '0.66rem', color: '#94a3b8' }}>
      {card.sub}
    </Typography>
  </Box>
);

export const StepRail = ({ steps, currentStepIndex, selectedStepKey, onSelect }) => {
  const stepSpacing = 0.9;
  const lastDotTop = 14;
  const railLeft = 18;
  const railTop = 18;
  const railBottom = 26;

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 4,
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
        overflow: 'hidden'
      }}
    >
      <CardContent
        sx={{
          p: 1.4,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
          <PartitionOutlined style={{ color: '#5b8cff' }} />
          <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
            표적 식별 파이프라인
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <Stack
            spacing={stepSpacing}
            sx={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              minHeight: 0,
              overflowY: 'auto',
              pr: 0.3,
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(148,163,184,0.5)',
                borderRadius: 999
              }
            }}
          >
            {steps.map((step, index) => {
              const isCurrent = index === currentStepIndex;
              const isDone = index < currentStepIndex;
              const isSelected = step.key === selectedStepKey;
              const isLast = index === steps.length - 1;

              return (
                <Box
                  key={step.key}
                  onClick={() => onSelect(step.key)}
                  sx={{
                    position: 'relative',
                    p: 1,
                    pl: 4.5,
                    borderRadius: 3,
                    cursor: 'pointer',
                    border: isSelected
                      ? '1px solid rgba(91,140,255,0.5)'
                      : '1px solid rgba(148,163,184,0.16)',
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(91,140,255,0.14), rgba(109,94,252,0.08))'
                      : isDone
                        ? 'rgba(248,250,252,0.95)'
                        : '#fff',
                    overflow: 'visible'
                  }}
                >
                  {!isLast && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: railLeft,
                        top: 24,
                        bottom: -10,
                        width: 2,
                        bgcolor: '#e2e8f0',
                        zIndex: 0
                      }}
                    />
                  )}

                  <Box
                    sx={{
                      position: 'absolute',
                      left: 13,
                      top: lastDotTop,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: '#fff',
                      border: `3px solid ${
                        isCurrent ? '#3563e9' : isDone ? '#10b981' : '#cbd5e1'
                      }`,
                      boxSizing: 'border-box',
                      zIndex: 2
                    }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 0.35,
                      gap: 0.8
                    }}
                  >
                    <Typography sx={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>
                      STEP {index + 1}
                    </Typography>

                    <Chip
                      size="small"
                      label={isCurrent ? 'RUN' : isDone ? 'DONE' : 'WAIT'}
                      icon={isCurrent ? <SyncOutlined spin /> : undefined}
                      sx={{
                        height: 18,
                        flexShrink: 0,
                        '& .MuiChip-label': { px: 0.8, fontSize: '0.56rem', fontWeight: 800 },
                        bgcolor: isCurrent ? '#e8f0ff' : isDone ? '#ecfdf5' : '#f8fafc',
                        color: isCurrent ? '#3563e9' : isDone ? '#0f766e' : '#64748b'
                      }}
                    />
                  </Box>

                  <Typography sx={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 800, mb: 0.2 }}>
                    {step.title}
                  </Typography>

                  <Typography sx={{ fontSize: '0.67rem', color: '#64748b', lineHeight: 1.4 }}>
                    {step.description}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export const AnalysisStreamPanel = ({ step, streamedLogs, progress, stepInsights }) => {
  const safeInsights = Array.isArray(stepInsights?.[step?.key]) ? stepInsights[step?.key] : [];
  const normalizedLogs = Array.isArray(streamedLogs) ? streamedLogs.map(parseLogItem) : [];

  const scoreItems = [
    { label: '구조 기반 기여', value: step?.key === 'structural-scoring' ? 34 : 26 },
    { label: 'GNN 기반 기여', value: step?.key === 'gnn-scoring' ? 36 : 24 },
    { label: '역할/제어 기여', value: step?.key === 'role-assessment' ? 28 : 19 },
    { label: '유효성/영향 기여', value: ['neighbor-analysis', 'target-validation'].includes(step?.key) ? 30 : 20 }
  ];

  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)'
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
              실행 로그 스트림
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.25, lineHeight: 1.55 }}>
              현재 단계 로그가 일정 간격으로 누적되며, 타임스탬프와 로그 레벨이 함께 표시됩니다.
            </Typography>
          </Box>
          <Chip
            label={step?.title ?? '-'}
            sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 800, flexShrink: 0 }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: 1.2,
            alignItems: 'start'
          }}
        >
          <Stack spacing={1.1}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: 'rgba(148,163,184,0.18)',
                bgcolor: '#fcfdff'
              }}
            >
              <CardContent sx={{ p: 1.1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    단계 진행 상태
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #5b8cff, #8b5cf6)'
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: 'rgba(148,163,184,0.18)',
                background: '#ffffff'
              }}
            >
              <CardContent sx={{ p: 1.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.9 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    실행 로그 스트림
                  </Typography>
                  <Chip
                    size="small"
                    label={step?.title ?? '-'}
                    sx={{
                      height: 20,
                      bgcolor: '#eef2ff',
                      color: '#4338ca',
                      '& .MuiChip-label': { px: 0.8, fontSize: '0.58rem', fontWeight: 800 }
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    height: 320,
                    overflowY: 'auto',
                    borderRadius: 3,
                    border: '1px solid rgba(148,163,184,0.18)',
                    background: '#ffffff',
                    px: 1,
                    py: 1,
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(148,163,184,0.5)',
                      borderRadius: 999
                    }
                  }}
                >
                  <Stack spacing={0.45}>
                    {normalizedLogs.map((item, idx) => {
                      const isLast = idx === normalizedLogs.length - 1;

                      return (
                        <Box
                          key={item.id}
                          sx={{
                            px: 0.9,
                            py: 0.65,
                            borderRadius: 2,
                            border: isLast
                              ? '1px solid rgba(91,140,255,0.32)'
                              : '1px solid rgba(226,232,240,0.9)',
                            background: isLast ? '#f8fbff' : '#ffffff'
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.68rem',
                              lineHeight: 1.45,
                              color: '#334155',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            [{formatTimestamp(item.timestamp)}] [{item.level}] {item.message}
                          </Typography>
                        </Box>
                      );
                    })}

                    {normalizedLogs.length === 0 && (
                      <Typography sx={{ fontSize: '0.69rem', color: '#64748b', lineHeight: 1.6 }}>
                        아직 표시할 로그가 없습니다.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Stack>

          <Stack spacing={1.1}>
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'rgba(148,163,184,0.18)' }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', mb: 0.8 }}>
                  이번 단계 핵심 변화
                </Typography>
                <Stack spacing={0.55}>
                  {safeInsights.map((item) => (
                    <Typography key={item} sx={{ fontSize: '0.69rem', color: '#475569', lineHeight: 1.55 }}>
                      • {item}
                    </Typography>
                  ))}
                  {safeInsights.length === 0 && (
                    <Typography sx={{ fontSize: '0.69rem', color: '#64748b', lineHeight: 1.5 }}>
                      • 이번 단계 변화 요약이 아직 없습니다.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'rgba(148,163,184,0.18)' }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', mb: 0.8 }}>
                  점수 기여도
                </Typography>
                <Stack spacing={0.7}>
                  {scoreItems.map((item) => (
                    <Box key={item.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography sx={{ fontSize: '0.66rem', color: '#475569', fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.66rem', color: '#111827', fontWeight: 800 }}>
                          {item.value}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.value}
                        sx={{
                          height: 6,
                          borderRadius: 999,
                          bgcolor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #5b8cff, #8b5cf6)'
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export const CandidateTargetList = ({ candidates, selectedId, onSelect, visible }) => {
  if (!visible) {
    return (
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)'
        }}
      >
        <CardContent sx={{ p: 1.35 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', mb: 0.7 }}>
            후보 표적 목록
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.6 }}>
            모든 파이프라인 단계가 완료되면 최종 점수 기준으로 후보 표적 목록이 순차적으로 추가됩니다.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        width: '100%',
        minWidth: 0,
        borderRadius: 4,
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <CardContent
        sx={{
          p: 1.35,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', mb: 0.9 }}>
          후보 표적 목록
        </Typography>

        <Stack
          spacing={0.75}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 0.4,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(148,163,184,0.5)',
              borderRadius: 999
            }
          }}
        >
          {candidates.map((item, index) => {
            const isSelected = item.id === selectedId;

            return (
              <Box
                key={item.id}
                onClick={() => onSelect(item.id)}
                sx={{
                  p: 1,
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(91,140,255,0.45)' : '1px solid rgba(148,163,184,0.16)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(91,140,255,0.12), rgba(109,94,252,0.08))'
                    : '#fff',
                  flexShrink: 0
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.45 }}>
                  <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                    #{index + 1} {item.id}
                  </Typography>
                  <Chip
                    size="small"
                    label={item.label ?? '후보'}
                    sx={{
                      height: 20,
                      bgcolor: '#eef2ff',
                      color: '#4338ca',
                      '& .MuiChip-label': { px: 0.8, fontSize: '0.58rem', fontWeight: 800 }
                    }}
                  />
                </Box>

                <Typography sx={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.5 }}>
                  {item.type ?? 'device'} / Zone {item.zone ?? '-'} / {item.subnet ?? '-'}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.55 }}>
                  <Typography sx={{ fontSize: '0.64rem', color: '#64748b' }}>
                    Final Score
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#111827' }}>
                    {item.final ?? '-'}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          {candidates.length === 0 && (
            <Typography sx={{ fontSize: '0.69rem', color: '#64748b' }}>
              후보 표적이 아직 추가되지 않았습니다.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export const DetailPanel = ({ row, candidates, selectedId, onSelect }) => {
  const validationItems = useMemo(
    () => [
      { label: '구조적 중요도 적합', status: (row?.final ?? 0) >= 85 ? 'PASS' : 'REVIEW' },
      {
        label: '경로 제어력 확보',
        status: ['router', 'switch', 'hub', 'firewall'].includes(row?.type) ? 'PASS' : 'CHECK'
      },
      {
        label: 'Zone 경계 영향 존재',
        status:
          row?.type === 'router' || row?.type === 'firewall'
            ? 'PASS'
            : (row?.neighborIds?.length ?? 0) >= 2
              ? 'PASS'
              : 'CHECK'
      },
      {
        label: '연결 경로 안정성',
        status: (row?.neighborIds?.length ?? 0) >= 1 ? 'PASS' : 'CHECK'
      }
    ],
    [row]
  );

  return (
    <Stack
      spacing={1.1}
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        sx={{
          flex: '0 0 220px',
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        <CandidateTargetList
          candidates={candidates}
          selectedId={selectedId}
          visible
          onSelect={onSelect}
        />
      </Box>

      <Card
        sx={{
          borderRadius: 4,
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
          flex: '0 0 auto'
        }}
      >
        <CardContent sx={{ p: 1.35 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
            <ApartmentOutlined style={{ color: '#5b8cff' }} />
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              선택 노드 상세
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.68rem', color: '#64748b', mb: 1, lineHeight: 1.55 }}>
            후보 표적 목록에서 선택한 노드의 상세 속성과 점수를 표시합니다.
          </Typography>

          <Stack spacing={0.6}>
            {[
              ['Device ID', row?.id ?? '-'],
              ['IP', row?.ip ?? '-'],
              ['Type', row?.type ?? '-'],
              ['Zone', row?.zone ?? '-'],
              ['Subnet', row?.subnet ?? '-'],
              ['Gateway', row?.gateway ?? '-'],
              ['MAC', row?.mac ?? '-'],
              ['Relation', row?.relationType ?? '-'],
              ['Traffic', row?.traffic ?? '-']
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.67rem', color: '#64748b' }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.69rem', color: '#111827', fontWeight: 700, textAlign: 'right' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 4,
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CardContent
          sx={{
            p: 1.35,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(148,163,184,0.5)',
              borderRadius: 999
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
            <SafetyCertificateOutlined style={{ color: '#14b8a6' }} />
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              표적 유효성 검증
            </Typography>
          </Box>

          <Stack spacing={0.65}>
            {validationItems.map((item) => {
              const color =
                item.status === 'PASS'
                  ? '#0f766e'
                  : item.status === 'REVIEW'
                    ? '#b45309'
                    : '#475569';

              const bg =
                item.status === 'PASS'
                  ? '#ecfdf5'
                  : item.status === 'REVIEW'
                    ? '#fff7ed'
                    : '#f8fafc';

              return (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(148,163,184,0.16)',
                    borderRadius: 2.5,
                    px: 1,
                    py: 0.65
                  }}
                >
                  <Typography sx={{ fontSize: '0.67rem', color: '#334155', fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                  <Chip size="small" label={item.status} sx={{ bgcolor: bg, color, fontWeight: 800, height: 20 }} />
                </Box>
              );
            })}
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={0.65}>
            <Typography sx={{ fontSize: '0.69rem', color: '#475569', lineHeight: 1.55 }}>
              • {row?.rationale ?? '선택 노드 설명 정보가 없습니다.'}
            </Typography>
            <Typography sx={{ fontSize: '0.69rem', color: '#475569', lineHeight: 1.55 }}>
              • Neighbor count {row?.neighborIds?.length ?? 0} / Zone {row?.zone ?? '-'} / Subnet {row?.subnet ?? '-'}
            </Typography>
            <Typography sx={{ fontSize: '0.69rem', color: '#475569', lineHeight: 1.55 }}>
              • PageRank {row?.pagerank ?? '-'} / Betweenness {row?.betweenness ?? '-'} / Closeness {row?.closeness ?? '-'}
            </Typography>
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 700 }}>
                최종 표적 점수
              </Typography>
              <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: '#5b46d8', lineHeight: 1.1 }}>
                {row?.final ?? '-'}
              </Typography>
            </Box>
            <Chip label={row?.label ?? '미정'} sx={{ bgcolor: '#f3e8ff', color: '#6d28d9', fontWeight: 800 }} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};