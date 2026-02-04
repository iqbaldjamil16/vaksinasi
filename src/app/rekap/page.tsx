
'use client';

import { useEffect, useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion";
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
import { PasswordDialog } from "@/components/password-dialog";
import { useCollection } from "@/firebase/firestore/use-collection";

interface RecapData {
    [puskeswan: string]: {
        medicines: { [medicineName: string]: { count: number, unit: string } };
        cases: { 
            [desa: string]: {
                [livestockType: string]: number 
            }
        };
    };
}

function processRecapData(services: HealthcareService[]): RecapData {
    const recap: RecapData = {};

    services.forEach(service => {
        if (!service.puskeswan) return;
        if (!recap[service.puskeswan]) {
            recap[service.puskeswan] = { medicines: {}, cases: {} };
        }

        const desa = service.ownerAddress.trim() || 'Tidak Diketahui';
        
        service.vaccinations.forEach(vaccination => {
            const livestockType = vaccination.animalType.trim();
            const livestockCount = vaccination.animalCount;

            if (!recap[service.puskeswan].cases[desa]) {
                recap[service.puskeswan].cases[desa] = {};
            }
            recap[service.puskeswan].cases[desa][livestockType] = (recap[service.puskeswan].cases[desa][livestockType] || 0) + livestockCount;
        });

        service.treatments.forEach(treatment => {
            const medicineName = treatment.medicineName.trim();
            const dosageValue = treatment.dosageValue || 0;
            const dosageUnit = treatment.dosageUnit || 'unit';

            if (!recap[service.puskeswan].medicines[medicineName]) {
                recap[service.puskeswan].medicines[medicineName] = { count: 0, unit: dosageUnit };
            }
            
            recap[service.puskeswan].medicines[medicineName].count += dosageValue;
            if (recap[service.puskeswan].medicines[medicineName].unit === 'unit' && dosageUnit !== 'unit') {
                 recap[service.puskeswan].medicines[medicineName].unit = dosageUnit;
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


export default function RekapPage() {
    const [isPending, startTransition] = useTransition();
    const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
    const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
    const { firestore } = useFirebase();
    const router = useRouter();

    const servicesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const year = selectedYear === 'all-years' ? null : parseInt(selectedYear, 10);
        const month = selectedMonth === 'all-months' || selectedMonth === '' ? null : parseInt(selectedMonth, 10);

        const servicesCollection = collection(firestore, 'healthcareServices');
        const queryConstraints = [orderBy('date', 'desc')];

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
    const puskeswanList = Object.keys(recapData).sort();

    const totalRecapData = useMemo(() => {
        if (puskeswanList.length === 0) {
            return null;
        }
    
        const totalCases: { [livestockType: string]: number } = {};
        const totalMedicines: { [medicineName: string]: { count: number, unit: string } } = {};
    
        for (const puskeswan of puskeswanList) {
            const data = recapData[puskeswan];
            if (!data) continue;
    
            if (data.cases) {
                for (const desa in data.cases) {
                    for (const livestockType in data.cases[desa]) {
                        totalCases[livestockType] = (totalCases[livestockType] || 0) + data.cases[desa][livestockType];
                    }
                }
            }
    
            if (data.medicines) {
                for (const medicineName in data.medicines) {
                    const { count, unit } = data.medicines[medicineName];
                    if (!totalMedicines[medicineName]) {
                        totalMedicines[medicineName] = { count: 0, unit: unit };
                    }
                    totalMedicines[medicineName].count += count;
                    if (totalMedicines[medicineName].unit === 'unit' && unit !== 'unit') {
                        totalMedicines[medicineName].unit = unit;
                    }
                }
            }
        }
        return { cases: totalCases, medicines: totalMedicines };
    }, [recapData, puskeswanList]);
    
    const formatDosage = (count: number) => {
        return Number(count.toFixed(2)).toLocaleString("id-ID");
    };

    const handleDownload = () => {
        const wb = XLSX.utils.book_new();
    
        const monthLabel = selectedMonth === 'all-months' 
            ? 'Semua Bulan' 
            : months.find(m => m.value === selectedMonth)?.label || '';
    
        puskeswanList.forEach(puskeswan => {
            const data = recapData[puskeswan];
            if (!data) return;

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

            const medicineDataForSheet = Object.entries(data.medicines)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([medicineName, { count, unit }]) => ({
                    'Bulan': monthLabel,
                    'Nama Obat': medicineName,
                    'Total Dosis': `${formatDosage(count)} ${unit}`,
            }));
            
            const ws = XLSX.utils.json_to_sheet(caseDataForSheet.length > 0 ? caseDataForSheet : [{}]);
            XLSX.utils.sheet_add_json(ws, [{}], { origin: -1, skipHeader: true }); // Spacer
            XLSX.utils.sheet_add_json(ws, medicineDataForSheet.length > 0 ? medicineDataForSheet : [{}], { origin: -1 });
            
            const sheetName = puskeswan.replace('Puskeswan ', '').replace(/[/\\?*:[\]]/g, "");
            XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
        });

        if (totalRecapData) {
            const totalCaseDataForSheet = Object.entries(totalRecapData.cases)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([livestockType, count]) => ({
                    'Bulan': monthLabel,
                    'Jenis Ternak': livestockType,
                    'Jumlah': count,
                }));

            const totalMedicineDataForSheet = Object.entries(totalRecapData.medicines)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([medicineName, { count, unit }]) => ({
                    'Bulan': monthLabel,
                    'Nama Obat': medicineName,
                    'Total Dosis': `${formatDosage(count)} ${unit}`,
                }));

            const wsTotal = XLSX.utils.json_to_sheet(totalCaseDataForSheet.length > 0 ? totalCaseDataForSheet : [{}]);
            XLSX.utils.sheet_add_json(wsTotal, [{}], { origin: -1, skipHeader: true }); // Spacer
            XLSX.utils.sheet_add_json(wsTotal, totalMedicineDataForSheet.length > 0 ? totalMedicineDataForSheet : [{}], { origin: -1 });

            XLSX.utils.book_append_sheet(wb, wsTotal, "Rekap Total");
        }
    
        const yearLabel = selectedYear === 'all-years' ? 'SemuaTahun' : selectedYear;
        const filenameMonthLabel = selectedMonth === 'all-months' ? 'SemuaBulan' : months.find(m => m.value === selectedMonth)?.label || 'Bulan';
        XLSX.writeFile(wb, `rekap_data_${filenameMonthLabel}_${yearLabel}.xlsx`);
    };

  return (
    <div className="container px-4 sm:px-8 py-4 md:py-8">
       <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Rekap Obat dan Ternak</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Ringkasan penggunaan obat dan jumlah ternak yang ditangani per Puskeswan.
        </p>

        <div className="mt-6 md:mt-8">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            {(loading || isPending) && puskeswanList.length === 0 ? (
              <RecapSkeleton />
            ) : puskeswanList.length > 0 ? (
                 <Accordion type="multiple" className={cn("w-full space-y-4 transition-opacity duration-300", (loading || isPending) && "opacity-50")}>
                    {puskeswanList.map(puskeswan => {
                        const data = recapData[puskeswan];
                        const sortedMedicines = Object.entries(data.medicines).sort(([, a], [, b]) => b.count - a.count);
                        const sortedDesa = Object.keys(data.cases).sort();

                        return (
                            <AccordionItem value={puskeswan} key={puskeswan} className="border rounded-lg bg-card">
                                <AccordionTrigger className="px-4 sm:px-6 py-4 text-lg font-bold hover:no-underline">
                                    {puskeswan}
                                </AccordionTrigger>
                                <AccordionContent className="px-4 sm:px-6 pb-6">
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
                                                    {sortedDesa.length > 0 ? sortedDesa.map((desa) => 
                                                        Object.entries(data.cases[desa]).flatMap(([livestockType, count], livestockIndex) => 
                                                            (
                                                                <TableRow key={`${desa}-${livestockType}`}>
                                                                    {livestockIndex === 0 && (
                                                                        <TableCell rowSpan={Object.keys(data.cases[desa]).length} className="align-top font-medium">
                                                                            {desa}
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell>{livestockType}</TableCell>
                                                                    <TableCell className="text-right font-medium">{count}</TableCell>
                                                                </TableRow>
                                                            )
                                                        )
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center">Tidak ada kasus</TableCell>
                                                        </TableRow>
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
                                                        <TableRow>
                                                            <TableHead>Nama Obat</TableHead>
                                                            <TableHead className="text-right w-[120px]">Total Dosis</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortedMedicines.map(([medicine, {count, unit}]) => (
                                                             <TableRow key={medicine}>
                                                                <TableCell>{medicine}</TableCell>
                                                                <TableCell className="text-right font-medium">{`${formatDosage(count)} ${unit}`}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}

                    {totalRecapData && (
                        <AccordionItem value="rekap-total" key="rekap-total" className="border rounded-lg bg-card">
                            <AccordionTrigger className="px-4 sm:px-6 py-4 text-lg font-bold hover:no-underline">
                                Rekap Total Puskeswan
                            </AccordionTrigger>
                            <AccordionContent className="px-4 sm:px-6 pb-6">
                                <div className="space-y-8">
                                    <div className="overflow-x-auto">
                                        <h3 className="font-semibold mb-2">Total Rekap Kasus Ternak</h3>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Jenis Ternak</TableHead>
                                                        <TableHead className="text-right w-[80px]">Jumlah</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.keys(totalRecapData.cases).length > 0 ? (
                                                        Object.entries(totalRecapData.cases)
                                                            .sort(([a], [b]) => a.localeCompare(b))
                                                            .map(([livestockType, count]) => (
                                                                <TableRow key={livestockType}>
                                                                    <TableCell className="font-medium">{livestockType}</TableCell>
                                                                    <TableCell className="text-right font-medium">{count}</TableCell>
                                                                </TableRow>
                                                            ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={2} className="text-center">Tidak ada kasus</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <h3 className="font-semibold mb-2">Total Rekap Penggunaan Obat</h3>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nama Obat</TableHead>
                                                        <TableHead className="text-right w-[120px]">Total Dosis</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.keys(totalRecapData.medicines).length > 0 ? (
                                                        Object.entries(totalRecapData.medicines)
                                                            .sort(([, a], [, b]) => b.count - a.count)
                                                            .map(([medicine, { count, unit }]) => (
                                                                <TableRow key={medicine}>
                                                                    <TableCell>{medicine}</TableCell>
                                                                    <TableCell className="text-right font-medium">{`${formatDosage(count)} ${unit}`}</TableCell>
                                                                </TableRow>
                                                            ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={2} className="text-center">Tidak ada penggunaan obat</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                 </Accordion>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Kosong</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Tidak ada data untuk periode yang dipilih atau belum ada data sama sekali.</p>
                    </CardContent>
                </Card>
            )}
             <div className="flex justify-end mt-8">
                <PasswordDialog
                    title="Akses Terbatas"
                    description="Silakan masukkan kata sandi untuk mengunduh rekap."
                    onSuccess={handleDownload}
                    trigger={
                        <Button disabled={loading || puskeswanList.length === 0 || isPending}>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh Rekap
                        </Button>
                    }
                />
            </div>
        </div>
      </div>
       <Button
          variant="default"
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg"
          aria-label="Kembali ke halaman utama"
          onClick={() => router.push('/')}
        >
          <CornerUpLeft className="h-7 w-7" />
        </Button>
    </div>
  );
}
