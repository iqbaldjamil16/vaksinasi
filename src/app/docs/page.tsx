'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CornerUpLeft, Download, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, query, where, Timestamp, orderBy, Query, DocumentData } from 'firebase/firestore';
import { type HealthcareService, serviceSchema } from '@/lib/types';
import { format, getMonth, getYear, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { puskeswanList, officerListMap } from '@/lib/definitions';

const years = Array.from({ length: 5 }, (_, i) => getYear(subYears(new Date(), i)).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i.toString(),
  label: new Date(0, i).toLocaleString('id-ID', { month: 'long' })
}));

// Helper interface to access internal query properties for error reporting
interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
    }
  }
}

export default function DocsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const [selectedPuskeswan, setSelectedPuskeswan] = useState<string>('all-puskeswan');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all-officers');
  const [officerSearchTerm, setOfficerSearchTerm] = useState<string>('');

  const currentOfficerList = useMemo(() => {
    if (selectedPuskeswan === 'all-puskeswan') return [];
    return officerListMap[selectedPuskeswan] || [];
  }, [selectedPuskeswan]);

  const handleGeneratePdf = () => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Koneksi Firestore tidak tersedia.' });
        return;
    }
    setIsGenerating(true);

    const servicesCollection = collection(firestore, 'healthcareServices');
    
    const year = selectedYear === 'all-years' ? null : parseInt(selectedYear, 10);
    const month = selectedMonth === 'all-months' ? null : parseInt(selectedMonth, 10);

    const queryConstraints: any[] = [orderBy('date', 'asc')];

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

    const q = query(servicesCollection, ...queryConstraints);
    
    getDocs(q).then(querySnapshot => {
      let allServices: HealthcareService[] = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data();
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
              allServices.push(service);
          } catch (e) {
              // Validation error ignored
          }
      });
      
      const searchTerms = officerSearchTerm.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);

      const services = allServices.filter(s => {
          const matchPuskeswan = selectedPuskeswan === 'all-puskeswan' || s.puskeswan === selectedPuskeswan;
          
          let matchOfficer = selectedOfficer === 'all-officers' || s.officerName.includes(selectedOfficer);
          
          if (searchTerms.length > 0) {
            matchOfficer = searchTerms.every(term => s.officerName.toLowerCase().includes(term));
          }

          return matchPuskeswan && matchOfficer;
      });

      if (services.length === 0) {
          toast({ title: 'Info', description: 'Tidak ada data pelayanan untuk kriteria yang dipilih.' });
          setIsGenerating(false);
          return;
      }

      const pdf = new jsPDF({ orientation: 'landscape' });
      const pageWidth = pdf.internal.pageSize.getWidth();

      // --- Main Title ---
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('LAPORAN PELAYANAN KESEHATAN HEWAN', pageWidth / 2, 12, { align: 'center' });

      // --- Sub Title Line 2 (Dynamic Villages) ---
      const uniqueDesas = Array.from(new Set(services.map(s => {
        const addr = s.ownerAddress.trim().toUpperCase();
        return addr.startsWith('DESA') ? addr : `DESA ${addr}`;
      }))).filter(Boolean).sort();
      
      const desaListString = uniqueDesas.length > 1 
        ? uniqueDesas.slice(0, -1).join(', ') + ' DAN ' + uniqueDesas[uniqueDesas.length - 1]
        : uniqueDesas[0] || 'SEMUA DESA';
      
      const yearString = selectedYear === 'all-years' ? getYear(new Date()).toString() : selectedYear;
      const subTitle = `PROGRAM VAKSINASI RABIES ${desaListString} ${yearString}`;
      
      pdf.setFontSize(11);
      pdf.text(subTitle, pageWidth / 2, 19, { align: 'center' });
      
      // --- Metadata Section ---
      pdf.setFontSize(9);
      let currentY = 28;
      const labelX = 14;
      const colonX = 45;
      const valueX = 47;
      const lineHeight = 5;

      const drawMetadataRow = (label: string, value: string) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, labelX, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(':', colonX, currentY);
        pdf.text(value, valueX, currentY);
        currentY += lineHeight;
      };

      drawMetadataRow('Puskeswan', selectedPuskeswan === 'all-puskeswan' ? 'Semua Puskeswan' : selectedPuskeswan);
      // Fixed officer name as requested: drh. Iqbal Djamil
      drawMetadataRow('Petugas', 'drh. Iqbal Djamil');

      const monthLabelText = months.find(m => m.value === selectedMonth)?.label || 'Semua Bulan';
      const yearLabelText = selectedYear === 'all-years' ? 'Semua Tahun' : selectedYear;
      let periodLabel = selectedYear === 'all-years' ? 'Semua Periode' : (selectedMonth === 'all-months' ? yearLabelText : `${monthLabelText} ${yearLabelText}`);
      drawMetadataRow('Periode', periodLabel);

      if (services.length > 0) {
        const tableColumn = [
          "No.", 
          "Tanggal", 
          "Nama Pemilik", 
          "Alamat Pemilik", 
          "Program Vaksinasi", 
          "Jenis Vaksin", 
          "Jenis Hewan", 
          "Jenis Kelamin", 
          "Umur", 
          "Jumlah Hewan"
        ];
        const tableRows: any[][] = [];
        let rowCount = 1;

        services.forEach((service) => {
            const groupedVaccinations: Record<string, { 
                animalType: string, 
                gender: string, 
                age: string, 
                animalCount: number 
            }> = {};

            service.vaccinations.forEach(v => {
                const genderStr = v.gender || '-';
                const ageStr = v.age ? `${v.age} ${v.ageUnit || ''}` : '-';
                const key = `${v.animalType}|${genderStr}|${ageStr}`;

                if (groupedVaccinations[key]) {
                    groupedVaccinations[key].animalCount += v.animalCount;
                } else {
                    groupedVaccinations[key] = {
                        animalType: v.animalType,
                        gender: genderStr,
                        age: ageStr,
                        animalCount: v.animalCount
                    };
                }
            });

            Object.values(groupedVaccinations).forEach(group => {
                tableRows.push([
                    rowCount++,
                    format(new Date(service.date), 'dd-MM-yyyy', { locale: id }),
                    service.ownerName,
                    service.ownerAddress,
                    service.vaccinationProgram,
                    service.vaccineName,
                    group.animalType,
                    group.gender,
                    group.age,
                    group.animalCount,
                ]);
            });
        });
        
        const totalLivestock = services.reduce((sum, service) => sum + service.vaccinations.reduce((s, v) => s + v.animalCount, 0), 0);

        autoTable(pdf, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY + 3,
            styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], valign: 'middle', overflow: 'linebreak' },
            headStyles: { fillColor: [38, 89, 43], textColor: [255, 255, 255], fontSize: 8, halign: 'center', valign: 'middle', fontStyle: 'bold' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 8 },
              1: { cellWidth: 18 },
              9: { halign: 'center', cellWidth: 15 },
            },
            margin: { left: 14, right: 14 }
        });
        
        const finalY = (pdf as any).lastAutoTable.finalY;
        const totalText = `Total Data: ${services.length} - Total Pelayanan Keswan: ${totalLivestock} Ekor`;
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(totalText, 14, finalY + 8);
      }

      const fileName = `laporan-pelayanan-${periodLabel.replace(/\s/g, '_')}.pdf`;
      pdf.save(fileName);
      setIsGenerating(false);

    }).catch(error => {
        const queryPath = (q as unknown as InternalQuery)._query.path.canonicalString();
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: queryPath,
          operation: 'list'
        }));
        toast({ variant: 'destructive', title: 'Gagal', description: 'Terjadi kesalahan saat membuat PDF.' });
    }).finally(() => {
        setIsGenerating(false);
    });
  };

  return (
    <div className="container px-4 sm:px-8 py-4 md:py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight font-headline">
              Laporan PDF Pelayanan
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-2 text-sm md:text-base">
              Halaman ini menyediakan fitur untuk mengunduh laporan PDF pelayanan kesehatan hewan berdasarkan filter yang dipilih.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Filter Laporan</CardTitle>
                <CardDescription>Pilih kriteria untuk laporan yang akan diunduh.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select value={selectedPuskeswan} onValueChange={(val) => {
                        setSelectedPuskeswan(val);
                        setSelectedOfficer('all-officers');
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Semua Puskeswan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-puskeswan">Semua Puskeswan</SelectItem>
                            {puskeswanList.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedOfficer} onValueChange={setSelectedOfficer} disabled={selectedPuskeswan === 'all-puskeswan'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Semua Petugas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-officers">Semua Petugas</SelectItem>
                            {currentOfficerList.map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari Nama Petugas (Gunakan koma untuk banyak nama, misal: Haslim, Ishak)" 
                    value={officerSearchTerm}
                    onChange={(e) => setOfficerSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-months">Semua Bulan</SelectItem>
                            {months.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-years">Semua Tahun</SelectItem>
                            {years.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Unduh Laporan PDF</CardTitle>
                <CardDescription>Menghasilkan dokumen PDF sesuai dengan filter petugas, puskeswan, dan periode yang Anda pilih.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleGeneratePdf} disabled={isGenerating}>
                    {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Membuat PDF...</> : <><Download className="mr-2 h-4 w-4" /> Unduh Laporan PDF</>}
                </Button>
            </CardContent>
        </Card>
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
