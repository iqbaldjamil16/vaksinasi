
'use client';

import { useEffect, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { type HealthcareService, serviceSchema } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { getMonth, getYear, subYears, format, startOfMonth, endOfMonth } from "date-fns";
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Download, CornerUpLeft } from "lucide-react";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { PasswordDialog } from "@/components/password-dialog";
import { ServiceTable } from "@/components/service-table";
import { Input } from "@/components/ui/input";

interface RecapData {
    medicines: { [medicineName: string]: { count: number, unit: string } };
    cases: { 
        [desa: string]: {
            [livestockType: string]: number 
        }
    };
}

function processRecapData(services: HealthcareService[]): RecapData {
    const recap: RecapData = { medicines: {}, cases: {} };

    services.forEach(service => {
        const desa = service.ownerAddress.trim() || 'Tidak Diketahui';
        
        service.vaccinations.forEach(vaccination => {
            const livestockType = vaccination.animalType.trim();
            const livestockCount = vaccination.animalCount;

            if (!recap.cases[desa]) {
                recap.cases[desa] = {};
            }
            recap.cases[desa][livestockType] = (recap.cases[desa][livestockType] || 0) + livestockCount;
        });

        service.treatments.forEach(treatment => {
            const medicineName = treatment.medicineName.trim();
            const dosageValue = treatment.dosageValue || 0;
            const dosageUnit = treatment.dosageUnit || 'unit';

            if (!recap.medicines[medicineName]) {
                recap.medicines[medicineName] = { count: 0, unit: dosageUnit };
            }
            
            recap.medicines[medicineName].count += dosageValue;
            if (recap.medicines[medicineName].unit === 'unit' && dosageUnit !== 'unit') {
                 recap.medicines[medicineName].unit = dosageUnit;
            }
        });
    });

    return recap;
}

function RecapSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full mt-6" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

const years = Array.from({ length: 5 }, (_, i) => getYear(subYears(new Date(), i)).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(0, i).toLocaleString(id, { month: 'long' }),
}));


export default function RekapTopoyoPage() {
    const [isPending, startTransition] = useTransition();
    const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
    const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
    const { firestore } = useFirebase();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredServices, setFilteredServices] = useState<HealthcareService[]>([]);
    const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

    useEffect(() => {
        const updateHighlighted = () => {
          const storedEntries = JSON.parse(localStorage.getItem('newEntries') || '[]');
          const now = Date.now();
          const oneHour = 3600 * 1000;
          
          const validEntries = storedEntries.filter(
            (entry: { id: string, timestamp: number }) => (now - entry.timestamp) < oneHour
          );
    
          if (validEntries.length !== storedEntries.length) {
            localStorage.setItem('newEntries', JSON.stringify(validEntries));
          }
          
          setHighlightedIds(validEntries.map((entry: { id: string }) => entry.id));
        };
    
        updateHighlighted();
        const interval = setInterval(updateHighlighted, 60000);
    
        return () => clearInterval(interval);
    }, []);

    const servicesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const year = selectedYear === 'all-years' ? null : parseInt(selectedYear, 10);
        const month = selectedMonth === 'all-months' || selectedMonth === '' ? null : parseInt(selectedMonth, 10);

        const servicesCollection = collection(firestore, 'healthcareServices');
        const queryConstraints: any[] = [
            where('puskeswan', '==', 'Puskeswan Topoyo'),
            orderBy('date', 'desc')
        ];

        if (year !== null && month !== null) {
            const startDate = startOfMonth(new Date(year, month));
            const endDate = endOfMonth(new Date(year, month));
            queryConstraints.push(where('date', '>=', startDate));
            queryConstraints.push(where('date', '<=', endDate));
        } else if (year !== null) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            queryConstraints.push(where('date', '>=', startDate));
            queryConstraints.push(where('date', '<=', endDate));
        }

        return query(servicesCollection, ...queryConstraints);
      }, [firestore, selectedYear, selectedMonth]);

    const { data: rawServices, isLoading: loading } = useCollection<any>(servicesQuery);
    
    const services = useMemo(() => {
        if (!rawServices) return [];
        const fetchedServices: HealthcareService[] = [];
        rawServices.forEach((doc) => {
            const data = doc;
            try {
                if (!data.vaccinations && data.livestockType) {
                  data.vaccinations = [{
                      vaccineName: data.vaccinationProgram || '',
                      animalType: data.livestockType,
                      animalCount: data.livestockCount || 1,
                  }];
                }

                if (!data.caseDevelopments || data.caseDevelopments.length === 0) {
                  let status = 'Sembuh';
                  if (data.caseDevelopment && typeof data.caseDevelopment === 'string' && data.caseDevelopment.length > 0) {
                    status = data.caseDevelopment;
                  }
                  const totalAnimals = data.vaccinations?.reduce((sum: number, v: any) => sum + v.animalCount, 0) || 1;
                  data.caseDevelopments = [{
                    status: status,
                    count: totalAnimals,
                  }];
                }
                const service = serviceSchema.parse({
                    ...data,
                    id: doc.id,
                    date: (data.date as Timestamp).toDate(),
                });
                fetchedServices.push(service);
            } catch (e) {
                // console.error("Validation error parsing service data:", e);
            }
        });
        return fetchedServices;
      }, [rawServices]);

    useEffect(() => {
        startTransition(() => {
          let servicesToFilter = services;
    
          const lowercasedFilter = searchTerm.toLowerCase();
          if (lowercasedFilter) {
            servicesToFilter = servicesToFilter.filter((service) => {
              const ownerName = service.ownerName.toLowerCase();
              const officerName = service.officerName.toLowerCase();
              const animalTypes = service.vaccinations.map(v => v.animalType.toLowerCase()).join(' ');
              const formattedDate = format(new Date(service.date), 'dd MMM yyyy', {
                locale: id,
              }).toLowerCase();
    
              return (
                ownerName.includes(lowercasedFilter) ||
                officerName.includes(lowercasedFilter) ||
                animalTypes.includes(lowercasedFilter) ||
                formattedDate.includes(lowercasedFilter)
              );
            });
          }
          
          if (highlightedIds.length > 0) {
            const highlightedItems = servicesToFilter.filter(s => s.id! && highlightedIds.includes(s.id));
            const restItems = servicesToFilter.filter(s => !s.id || !highlightedIds.includes(s.id));
            servicesToFilter = [...highlightedItems, ...restItems];
          }
    
          setFilteredServices(servicesToFilter);
        });
    }, [searchTerm, services, highlightedIds]);

    const handleLocalDelete = (serviceId: string) => {
        setFilteredServices((currentServices) =>
          currentServices.filter((s) => s.id !== serviceId)
        );
         const newEntries = JSON.parse(localStorage.getItem('newEntries') || '[]');
         const updatedEntries = newEntries.filter((entry: {id: string}) => entry.id !== serviceId);
         if(newEntries.length !== updatedEntries.length) {
           localStorage.setItem('newEntries', JSON.stringify(updatedEntries));
           setHighlightedIds(updatedEntries.map((e: {id: string}) => e.id));
         }
    };

    const handleMonthChange = (month: string) => {
        startTransition(() => {
            setSelectedMonth(month);
        });
    };

    const handleYearChange = (year: string) => {
        startTransition(() => {
            setSelectedYear(year);
            if (year === 'all-years') {
                setSelectedMonth('all-months');
            } else if (year !== getYear(new Date()).toString() && selectedMonth === getMonth(new Date()).toString()){
                setSelectedMonth('all-months');
            }
        });
    };

    const recapData = useMemo(() => processRecapData(services), [services]);
    
    const formatDosage = (count: number) => {
        return Number(count.toFixed(2)).toLocaleString("id-ID");
    };

    const handleDownload = () => {
        const wb = XLSX.utils.book_new();
    
        const monthLabel = selectedMonth === 'all-months' 
            ? 'Semua Bulan' 
            : months.find(m => m.value === selectedMonth)?.label || '';
        const yearLabel = selectedYear === 'all-years' ? 'Semua Tahun' : selectedYear;
    
        const servicesByOfficer: { [key: string]: HealthcareService[] } = {};
        services.forEach(service => {
            if (!servicesByOfficer[service.officerName]) {
                servicesByOfficer[service.officerName] = [];
            }
            servicesByOfficer[service.officerName].push(service);
        });
    
        const officerNames = Object.keys(servicesByOfficer).sort();
        officerNames.forEach(officerName => {
            const officerServices = servicesByOfficer[officerName].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const tableHeaders = ['Tanggal', 'Nama Pemilik', 'Alamat Pemilik', 'Jenis Ternak', 'Jumlah', 'Vaksin', 'Obat yang Digunakan', 'Dosis'];
            
            const sheetData: any[][] = [
                ["PEMERINTAHAN KABUPATEN MAMUJU TENGAH"],
                ["DINAS KETAHANAN PANGAN DAN PERTANIAN"],
                ["LAPORAN PELAYANAN KESEHATAN HEWAN"],
                [],
                ['Nama Petugas', `: ${officerName}`],
                ['Kecamatan', `: Topoyo`],
                ['Bulan', `: ${monthLabel}`],
                ['Tahun', `: ${yearLabel}`],
                [],
                tableHeaders
            ];
    
            officerServices.forEach(service => {
                const animalDetails = service.vaccinations.map(v => v.animalType).join(', ');
                const animalCounts = service.vaccinations.map(v => v.animalCount).join(', ');
                const vaccineNames = service.vaccinations.map(v => v.vaccineName).join(', ');
                sheetData.push([
                    format(new Date(service.date), 'dd-MM-yyyy'),
                    service.ownerName,
                    service.ownerAddress,
                    animalDetails,
                    animalCounts,
                    vaccineNames,
                    service.treatments.map((t) => t.medicineName).join(', '),
                    service.treatments.map((t) => `${t.dosageValue} ${t.dosageUnit}`).join(', '),
                ]);
            });
    
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
            const merges = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
            ];
            ws['!merges'] = merges;
            
            ws['!cols'] = [
                { wch: 12 }, 
                { wch: 20 }, 
                { wch: 20 }, 
                { wch: 20 }, 
                { wch: 10 }, 
                { wch: 20 }, 
                { wch: 30 }, 
                { wch: 20 },
            ];
    
            const sheetName = officerName.replace(/[/\\?*:[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const data = recapData;
        if (data && Object.keys(data.cases).length > 0) {
            const caseDataForSheet = Object.entries(data.cases).flatMap(([desa, livestockData]) => {
                return Object.entries(livestockData).map(([livestockType, count]) => ({
                    'Bulan': monthLabel,
                    'Desa': desa,
                    'Jenis Ternak': livestockType,
                    'Jumlah': count,
                }));
            }).sort((a, b) => {
                const desaComp = a['Desa'].localeCompare(b['Desa']);
                if (desaComp !== 0) return desaComp;
                return a['Jenis Ternak'].localeCompare(b['Jenis Ternak']);
            });

            const wsKasus = XLSX.utils.json_to_sheet(caseDataForSheet);
            XLSX.utils.book_append_sheet(wb, wsKasus, "Rekap Kasus Topoyo");
        }

        if (data && Object.keys(data.medicines).length > 0) {
            const medicineDataForSheet = Object.entries(data.medicines)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([medicineName, { count, unit }]) => ({
                    'Bulan': monthLabel,
                    'Nama Obat': medicineName,
                    'Total Dosis': `${formatDosage(count)} ${unit}`,
            }));
            const wsObat = XLSX.utils.json_to_sheet(medicineDataForSheet);
            XLSX.utils.book_append_sheet(wb, wsObat, "Rekap Obat Topoyo");
        }
    
        const filenameYearLabel = selectedYear === 'all-years' ? 'SemuaTahun' : selectedYear;
        const filenameMonthLabel = selectedMonth === 'all-months' ? 'SemuaBulan' : months.find(m => m.value === selectedMonth)?.label || 'Bulan';
        XLSX.writeFile(wb, `rekap_topoyo_${filenameMonthLabel}_${filenameYearLabel}.xlsx`);
    };

    const hasData = recapData && (Object.keys(recapData.medicines).length > 0 || Object.keys(recapData.cases).length > 0);

  return (
    <div className="container px-4 sm:px-8 py-4 md:py-8">
       <div className="max-w-4xl mx-auto space-y-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Rekap Puskeswan Topoyo</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Ringkasan penggunaan obat, kasus, dan detail inputan di Puskeswan Topoyo.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all-months">Semua Bulan</SelectItem>
                    {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                        <SelectItem value="all-years">Semua Tahun</SelectItem>
                    {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Data Inputan Petugas</CardTitle>
                <CardDescription>Detail semua inputan untuk Puskeswan Topoyo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Input
                        placeholder="Cari data..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64"
                    />
                </div>
                <ServiceTable
                    services={filteredServices}
                    loading={loading && services.length === 0}
                    highlightedIds={highlightedIds}
                    searchTerm={searchTerm}
                    onDelete={handleLocalDelete}
                    isPending={isPending}
                />
            </CardContent>
        </Card>

        {(loading || isPending) && !hasData ? (
            <RecapSkeleton />
        ) : hasData ? (
            <Card className={cn("border rounded-lg bg-card", (isPending || loading) && "opacity-50")}>
                <CardHeader className="px-4 sm:px-6 py-4">
                    <CardTitle className="text-lg font-bold">Ringkasan Rekapitulasi</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="overflow-x-auto">
                            <h3 className="font-semibold mb-2">Rekap Kasus Ternak</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Desa</TableHead>
                                            <TableHead>Jenis Ternak</TableHead>
                                            <TableHead className="text-right w-[80px]">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {Object.keys(recapData.cases).length > 0 ? Object.keys(recapData.cases).sort().map((desa) => 
                                        Object.entries(recapData.cases[desa]).map(([livestockType, count], livestockIndex) => 
                                            (
                                                <TableRow key={`${desa}-${livestockType}`}>
                                                    {livestockIndex === 0 && (
                                                        <TableCell rowSpan={Object.keys(recapData.cases[desa]).length} className="align-top font-medium">{desa}</TableCell>
                                                    )}
                                                    <TableCell>{livestockType}</TableCell>
                                                    <TableCell className="text-right font-medium">{count}</TableCell>
                                                </TableRow>
                                            )
                                        )
                                    ) : (
                                        <TableRow><TableCell colSpan={3} className="text-center">Tidak ada kasus</TableCell></TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <h3 className="font-semibold mb-2">Rekap Penggunaan Obat</h3>
                                <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Nama Obat</TableHead><TableHead className="text-right w-[120px]">Total Dosis</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.keys(recapData.medicines).length > 0 ? Object.entries(recapData.medicines).sort(([, a], [, b]) => b.count - a.count).map(([medicine, {count, unit}]) => (
                                                <TableRow key={medicine}><TableCell>{medicine}</TableCell><TableCell className="text-right font-medium">{`${formatDosage(count)} ${unit}`}</TableCell></TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={2} className="text-center">Tidak ada penggunaan obat</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card>
                <CardHeader><CardTitle>Data Kosong</CardTitle></CardHeader>
                <CardContent><p>Tidak ada data untuk periode yang dipilih.</p></CardContent>
            </Card>
        )}
        <div className="flex justify-end">
            <PasswordDialog
                title="Akses Terbatas"
                description="Silakan masukkan kata sandi untuk mengunduh rekap."
                onSuccess={handleDownload}
                trigger={
                    <Button disabled={loading || !hasData || isPending}>
                        <Download className="mr-2 h-4 w-4" />
                        Unduh Rekap
                    </Button>
                }
            />
        </div>
      </div>
       <Button variant="default" className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg" aria-label="Kembali ke halaman utama" onClick={() => router.push('/')}>
          <CornerUpLeft className="h-7 w-7" />
        </Button>
    </div>
  );
}
