
'use client';

import { useMemo } from 'react';
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { type HealthcareService } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatItem {
  name: string;
  count: number;
}

function calculateStats(services: HealthcareService[], groupBy: 'month' | 'officerName' | 'puskeswan'): StatItem[] {
  if (services.length === 0) return [];

  const counts: { [key: string]: number } = {};

  services.forEach(service => {
      let key: string;
      const totalAnimals = service.vaccinations.reduce((sum, v) => sum + v.animalCount, 0);

      if (groupBy === 'month') {
          key = format(new Date(service.date), 'MMMM yyyy', { locale: id });
      } else {
          key = service[groupBy as keyof Omit<HealthcareService, 'date' | 'vaccinations' | 'treatments' | 'caseDevelopments'>] as string;
      }
      counts[key] = (counts[key] || 0) + totalAnimals;
  });

  return Object.entries(counts)
      .map(([name, count]) => ({
          name,
          count,
      }))
      .sort((a, b) => b.count - a.count);
}

const StatChart = ({
  title,
  data,
  officerToPuskeswanMap,
  puskeswanColors,
  defaultColor,
  showAll = false,
}: {
  title: string;
  data: StatItem[];
  officerToPuskeswanMap?: { [key: string]: string };
  puskeswanColors?: { [key: string]: string };
  defaultColor?: string;
  showAll?: boolean;
}) => {
  const isMobile = useIsMobile();
  
  const chartData = useMemo(() => {
    if (!data) return [];
    return showAll ? data : data.slice(0, 10);
  }, [data, showAll]);

  const yAxisWidth = isMobile ? 120 : 180;
  const rightMargin = isMobile ? 50 : 80;

  const barHeight = (title.includes("Kerbau") || title.includes("Statistik per Bulan")) ? 16 : 28;
  const minChartHeight = (title.includes("Kerbau") || title.includes("Statistik per Bulan")) ? 80 : 150;
  const chartHeight = Math.max(minChartHeight, chartData.length * barHeight);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-left">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pr-0 sm:pr-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: rightMargin, left: 0, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 11 : 12}
                interval={0}
                width={yAxisWidth}
                tickFormatter={(value) => value}
                tick={{ fontWeight: 'bold' }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div
                        className="rounded-lg border bg-background p-2 shadow-sm text-sm"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <span className="font-bold">{label}</span>
                        <span className="text-muted-foreground ml-2">
                          {`Jumlah Ternak: ${payload[0].value}`}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
                <Bar
                  dataKey="count"
                  name="Jumlah Ternak"
                  animationDuration={2000}
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                      dataKey="count"
                      position="right"
                      offset={8}
                      className="font-semibold"
                      fill="hsl(var(--foreground))"
                      fontSize={isMobile ? 11 : 12}
                  />
                  {(chartData as StatItem[]).map((entry, index) => {
                      let color = defaultColor || '#808080';
                      if (title.startsWith('Statistik Kasus/Penyakit')) {
                        color = '#006400';
                      } else if (title === 'Statistik per Bulan') {
                          color = '#FA8072';
                      } else if (title === 'Statistik per Petugas') {
                        const puskeswan = officerToPuskeswanMap?.[entry.name];
                        if (puskeswan) {
                          color = puskeswanColors?.[puskeswan] || color;
                        }
                      } else if (title === 'Statistik per Puskeswan') {
                        color = puskeswanColors?.[entry.name] || color;
                      }
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                </Bar>
            </BarChart>
          </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const StatPieChart = ({ title, data, colors, defaultColor }: {
  title: string;
  data: StatItem[];
  colors: { [key: string]: string };
  defaultColor: string;
}) => {
  const isMobile = useIsMobile();
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);
  const isPuskeswanChart = title === 'Statistik per Puskeswan';


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ textShadow: '0px 1px 2px rgba(0, 0, 0, 0.8)' }}
      >
        {value}
      </text>
    );
  };

  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-left">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={isMobile ? 80 : 100}
                      innerRadius={isMobile ? 30 : 40}
                      dataKey="count"
                      nameKey="name"
                      animationDuration={1500}
                  >
                      {data.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={colors[entry.name] || defaultColor} stroke={'hsl(var(--card))'} strokeWidth={2}/>
                      ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        const percentage = total > 0 ? (((item.value as number) / total) * 100).toFixed(1) : 0;
                        const name = item.name as string;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                            <span className="font-bold">{name}: </span>
                            <span className="text-muted-foreground">
                              {`${item.value} ternak (${percentage}%)`}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign={"bottom"}
                    align={"center"}
                    layout={'vertical'}
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingLeft: '0px',
                      color: 'hsl(var(--foreground))'
                    }}
                    iconSize={12}
                    iconType="circle"
                    formatter={(value) => <span style={{color: 'hsl(var(--foreground))'}}>{value}</span>}
                  />
              </PieChart>
          </ResponsiveContainer>
          {total > 0 && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={isPuskeswanChart ? { transform: 'translateY(-38px)' } : {}}
            >
              <span className="text-xl font-bold text-foreground">
                {total}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function StatisticsDisplay({ services }: { services: HealthcareService[] }) {
  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-left">Statistik Belum Tersedia</CardTitle>
          <CardDescription>
            Tidak ada data untuk ditampilkan statistiknya pada periode yang
            dipilih.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statsByMonth = calculateStats(services, 'month');
  const statsByOfficer = calculateStats(services, 'officerName');
  const statsByPuskeswan = calculateStats(services, 'puskeswan');


  const officerToPuskeswanMap: { [key: string]: string } = {};
  services.forEach((service) => {
    if (
      service.officerName &&
      service.puskeswan &&
      !officerToPuskeswanMap[service.officerName]
    ) {
      officerToPuskeswanMap[service.officerName] = service.puskeswan;
    }
  });

  const puskeswanColors: { [key: string]: string } = {
    'Puskeswan Topoyo': '#00008B',
    'Puskeswan Tobadak': '#006400',
    'Puskeswan Karossa': '#800080',
    'Puskeswan Budong-Budong': '#FFFF00',
    'Puskeswan Pangale': '#FF0000',
  };
  const defaultColor = '#808080';

  const caseStatusColors = {
    Sembuh: '#006400',
    'Tidak Sembuh': '#FFFF00',
    Mati: '#FF0000',
  };
  const defaultCaseStatusColor = '#808080';

  function calculateCaseDevelopmentStats(
    services: HealthcareService[]
  ): StatItem[] {
    const stats: { [key: string]: number } = {};
    services.forEach((service) => {
      if (service.caseDevelopments) {
        service.caseDevelopments.forEach((dev) => {
          if (dev.status) {
            stats[dev.status] = (stats[dev.status] || 0) + dev.count;
          }
        });
      }
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  const caseDevelopmentStats = calculateCaseDevelopmentStats(services);

  return (
    <div className="space-y-6">
      <StatChart
        title="Statistik per Bulan"
        data={statsByMonth}
        officerToPuskeswanMap={officerToPuskeswanMap}
        puskeswanColors={puskeswanColors}
        defaultColor={defaultColor}
      />
      <StatChart
        title="Statistik per Petugas"
        data={statsByOfficer}
        officerToPuskeswanMap={officerToPuskeswanMap}
        puskeswanColors={puskeswanColors}
        defaultColor={defaultColor}
        showAll={true}
      />
      <StatPieChart
        title="Statistik per Puskeswan"
        data={statsByPuskeswan}
        colors={puskeswanColors}
        defaultColor={defaultColor}
      />
      {caseDevelopmentStats.length > 0 && (
        <StatPieChart
          title="Statistik Perkembangan Kasus"
          data={caseDevelopmentStats}
          colors={caseStatusColors}
          defaultColor={defaultCaseStatusColor}
        />
      )}
    </div>
  );
}
