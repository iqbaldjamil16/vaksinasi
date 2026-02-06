'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, Timestamp, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { serviceSchema } from '@/lib/types';
import { parse } from 'date-fns';
import { useRouter } from 'next/navigation';


export function ExcelUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({
                variant: 'destructive',
                title: 'Tidak ada file',
                description: 'Silakan pilih file Excel untuk diunggah.',
            });
            return;
        }
        if (!firestore) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Koneksi Firestore tidak tersedia.',
            });
            return;
        }

        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if(json.length === 0) {
                    throw new Error("File Excel kosong atau tidak memiliki data.");
                }

                const batch = writeBatch(firestore);
                let count = 0;
                let errorCount = 0;
                let errorMessages : string[] = [];

                const servicesMap = new Map<string, any>();

                for (const [index, row] of json.entries()) {
                    // Create a unique key for each service based on owner, date, and puskeswan to group rows
                    const dateValue = row['Tanggal'];

                    let parsedDate: Date;
                     if (typeof dateValue === 'number') {
                        // Handle Excel serial date number
                        parsedDate = XLSX.SSF.parse_date_code(dateValue);
                    } else if (typeof dateValue === 'string') {
                        // Handle string date
                        parsedDate = parse(dateValue, 'dd-MM-yyyy', new Date());
                    } else {
                        console.warn(`Baris ${index + 2} dilewati: Format tanggal tidak dikenal -> ${dateValue}`);
                        errorCount++;
                        if(errorMessages.length < 5) errorMessages.push(`Baris ${index + 2}: Format tanggal tidak valid.`);
                        continue;
                    }
                    
                    if (isNaN(parsedDate.getTime())) {
                        console.warn(`Baris ${index + 2} dilewati: Format tanggal tidak valid -> ${dateValue}`);
                        errorCount++;
                        if(errorMessages.length < 5) errorMessages.push(`Baris ${index + 2}: Tanggal tidak valid.`);
                        continue;
                    }
                    
                    const ownerName = row['Nama Pemilik'];
                    const puskeswan = row['Puskeswan'];

                    if (!ownerName || !puskeswan) {
                        console.warn(`Baris ${index + 2} dilewati: Nama Pemilik atau Puskeswan kosong.`);
                        errorCount++;
                        if(errorMessages.length < 5) errorMessages.push(`Baris ${index + 2}: Nama Pemilik/Puskeswan kosong.`);
                        continue;
                    }


                    const key = `${ownerName}-${parsedDate.toISOString().split('T')[0]}-${puskeswan}`;
                    
                    if (!servicesMap.has(key)) {
                         servicesMap.set(key, {
                            date: parsedDate,
                            puskeswan: puskeswan || '',
                            officerName: row['Nama Petugas'] || '',
                            ownerName: ownerName || '',
                            ownerAddress: row['Alamat Pemilik'] || '',
                            nik: String(row['NIK'] || ''),
                            phoneNumber: String(row['No. HP'] || ''),
                            vaccinationProgram: row['Program Vaksinasi'] || '',
                            vaccinations: [],
                            treatments: [],
                            caseDevelopments: [],
                        });
                    }

                    const service = servicesMap.get(key);

                    // Add vaccination if present
                    if (row['Jenis Vaksin'] && row['Jenis Hewan'] && row['Jumlah Hewan'] > 0) {
                        const existingVaccination = service.vaccinations.find(
                            (v: any) => v.vaccineName === row['Jenis Vaksin'] && v.animalType === row['Jenis Hewan']
                        );
                        if (!existingVaccination) {
                            service.vaccinations.push({
                                vaccineName: row['Jenis Vaksin'],
                                animalType: row['Jenis Hewan'],
                                animalCount: Number(row['Jumlah Hewan']),
                            });
                        }
                    }

                    // Add treatment if present
                    if (row['Nama Obat'] && row['Nilai Dosis'] > 0 && row['Satuan Dosis']) {
                         const existingTreatment = service.treatments.find(
                            (t: any) => t.medicineName === row['Nama Obat']
                        );
                        if (!existingTreatment) {
                            service.treatments.push({
                                medicineType: row['Jenis Obat'] || 'Lainnya',
                                medicineName: row['Nama Obat'],
                                dosageValue: Number(row['Nilai Dosis']),
                                dosageUnit: row['Satuan Dosis'],
                            });
                        }
                    }
                    
                    // Add case development if present
                     if (row['Status Perkembangan Kasus'] && row['Jumlah Perkembangan Kasus'] > 0) {
                        const existingCaseDev = service.caseDevelopments.find(
                            (d: any) => d.status === row['Status Perkembangan Kasus']
                        );
                         if (!existingCaseDev) {
                            service.caseDevelopments.push({
                                status: row['Status Perkembangan Kasus'],
                                count: Number(row['Jumlah Perkembangan Kasus']),
                            });
                        }
                    }
                }

                const newEntryIds: string[] = [];

                for (const [key, serviceData] of servicesMap.entries()) {
                   try {
                        // Default empty arrays if they are undefined
                        serviceData.treatments = serviceData.treatments || [];
                        serviceData.vaccinations = serviceData.vaccinations || [];

                        const validatedData = serviceSchema.parse(serviceData);
                        const serviceDocRef = doc(collection(firestore, 'healthcareServices'));
                        batch.set(serviceDocRef, {
                            ...validatedData,
                            date: Timestamp.fromDate(validatedData.date),
                        });
                        newEntryIds.push(serviceDocRef.id);
                        count++;
                   } catch (validationError: any) {
                        console.error(`Data tidak valid untuk key ${key}, dilewati.`, validationError.errors);
                        errorCount++;
                        if(errorMessages.length < 5) errorMessages.push(`Data untuk ${serviceData.ownerName} tidak valid.`);
                   }
                }
                
                if (count === 0) {
                     throw new Error("Tidak ada data valid yang dapat diproses dari file. Periksa kembali format dan isi file Anda.");
                }

                await batch.commit();

                const newEntries = JSON.parse(localStorage.getItem('newEntries') || '[]');
                newEntryIds.forEach(id => newEntries.push({ id: id, timestamp: Date.now() }));
                localStorage.setItem('newEntries', JSON.stringify(newEntries));

                toast({
                    title: 'Unggah Berhasil',
                    description: `${count} data pelayanan berhasil diimpor. ${errorCount > 0 ? `${errorCount} baris dilewati karena error.` : ''}`,
                });
                
                router.push('/laporan');


            } catch (error: any) {
                console.error("Error processing file:", error);
                toast({
                    variant: 'destructive',
                    title: 'Unggah Gagal',
                    description: error.message || 'Terjadi kesalahan saat memproses file Excel.',
                });
            } finally {
                setIsProcessing(false);
                setFile(null);
                const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
                if (fileInput) {
                    fileInput.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Unggah Data dari Excel</CardTitle>
                <CardDescription>
                    Impor data dari file .xlsx atau .xls. Ini akan menggabungkan baris berdasarkan nama pemilik, tanggal, dan puskeswan yang sama.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="excel-upload">Pilih File Excel</Label>
                    <Input 
                        id="excel-upload"
                        type="file" 
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                </div>
                 <Button onClick={handleUpload} disabled={isProcessing || !file}>
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                    ) : (
                        <><Upload className="mr-2 h-4 w-4" /> Unggah dan Simpan</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
