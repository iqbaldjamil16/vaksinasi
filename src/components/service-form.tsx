"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from 'date-fns/locale';
import { doc, collection, Timestamp, setDoc } from 'firebase/firestore';

import { cn } from "@/lib/utils";
import { serviceSchema, type HealthcareService } from "@/lib/types";
import { livestockTypes, puskeswanList, dosageUnits, karossaDesaList, budongBudongDesaList, pangaleDesaList, tobadakDesaList, topoyoDesaList, budongBudongOfficerList, karossaOfficerList, pangaleOfficerList, tobadakOfficerList, topoyoOfficerList, caseStatusOptions, vaccinationPrograms, vaccineLists, genderOptions, ageUnits } from "@/lib/definitions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/firebase/provider";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


export function ServiceForm({ 
  initialData, 
  formType, 
  showSubmitButton = true, 
  formId,
  onSubmittingChange 
}: { 
  initialData?: HealthcareService, 
  formType?: 'keswan' | 'vaksinasi',
  showSubmitButton?: boolean,
  formId?: string,
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const router = useRouter();
  const isEditMode = !!initialData;

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const form = useForm<HealthcareService>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initialData ? {
      ...initialData,
      date: initialData.date ? new Date(initialData.date) : new Date(),
      vaccineName: initialData.vaccineName || initialData.vaccinations?.[0]?.vaccineName || "",
    } : {
      date: new Date(),
      puskeswan: "",
      officerName: "",
      ownerName: "",
      ownerAddress: "",
      nik: "",
      phoneNumber: "",
      vaccinationProgram: "",
      vaccineName: "",
      vaccinations: [{ vaccineName: "", animalType: "", animalCount: 1, gender: "", age: "", ageUnit: "Tahun" }],
      treatments: [],
      caseDevelopments: formType === 'vaksinasi' ? [] : [{ status: "", count: 1 }],
    },
  });
  
  const { fields: treatmentFields, append: appendTreatment, remove: removeTreatment } = useFieldArray({
    control: form.control,
    name: "treatments",
  });

  const { fields: caseDevelopmentFields, append: appendCaseDevelopment, remove: removeCaseDevelopment } = useFieldArray({
    control: form.control,
    name: "caseDevelopments",
  });

  const { fields: vaccinationFields, append: appendVaccination, remove: removeVaccination } = useFieldArray({
    control: form.control,
    name: "vaccinations",
  });

  const watchedPuskeswan = form.watch("puskeswan");
  const watchedVaccinationProgram = form.watch("vaccinationProgram");
  const watchedVaccineName = form.watch("vaccineName");

  const [showManualVaccineName, setShowManualVaccineName] = useState<boolean>(
    initialData ? ! (vaccineLists[initialData.vaccinationProgram || ''] || []).includes(initialData.vaccineName || initialData.vaccinations?.[0]?.vaccineName || '') : false
  );

  const officerListMap: Record<string, string[]> = {
    'Puskeswan Budong-Budong': budongBudongOfficerList,
    'Puskeswan Karossa': karossaOfficerList,
    'Puskeswan Pangale': pangaleOfficerList,
    'Puskeswan Tobadak': tobadakOfficerList,
    'Puskeswan Topoyo': topoyoOfficerList,
  };
  const officerList = officerListMap[watchedPuskeswan] || [];
  const isOfficerSelection = officerList.length > 0;

  const [showManualOfficerName, setShowManualOfficerName] = useState(
    initialData ? isOfficerSelection && !officerList.includes(initialData.officerName) : false
  );

  const desaListMap: Record<string, string[]> = {
    'Puskeswan Karossa': karossaDesaList,
    'Puskeswan Budong-Budong': budongBudongDesaList,
    'Puskeswan Pangale': pangaleDesaList,
    'Puskeswan Tobadak': tobadakDesaList,
    'Puskeswan Topoyo': topoyoDesaList,
  };
  const desaList = desaListMap[watchedPuskeswan] || [];
  const isDesaSelection = desaList.length > 0;
  
  const [showManualOwnerAddress, setShowManualOwnerAddress] = useState(
    initialData ? isDesaSelection && !desaList.includes(initialData.ownerAddress) : false
  );

  function onSubmit(values: HealthcareService) {
    if (!firestore) {
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan",
          description: "Koneksi database tidak tersedia.",
        });
        return;
    }
    
    setIsSubmitting(true);

    const { id, caseDevelopment, ...dataToSave } = values;
    
    // Apply the global vaccine name to all vaccination details
    const updatedVaccinations = dataToSave.vaccinations.map(v => ({
      ...v,
      vaccineName: dataToSave.vaccineName
    }));

    const serviceData = {
      ...dataToSave,
      vaccinations: updatedVaccinations,
      date: Timestamp.fromDate(values.date),
    };

    if (isEditMode && initialData?.id) {
        const serviceDocRef = doc(firestore, 'healthcareServices', initialData.id);
        setDoc(serviceDocRef, serviceData, { merge: true })
          .then(() => {
            toast({
              title: "Sukses",
              description: "Data pelayanan berhasil diperbarui. Mengarahkan...",
            });
            router.push('/laporan');
          })
          .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: serviceDocRef.path,
              operation: 'update',
              requestResourceData: serviceData,
            }));
            toast({
              variant: "destructive",
              title: "Gagal Memperbarui",
              description: "Terjadi kesalahan saat memperbarui data. Periksa kembali isian Anda.",
            });
          })
          .finally(() => {
            setIsSubmitting(false);
          });
    } else {
        const newDocRef = doc(collection(firestore, 'healthcareServices'));
        setDoc(newDocRef, serviceData)
          .then(() => {
            const newEntries = JSON.parse(localStorage.getItem('newEntries') || '[]');
            newEntries.push({ id: newDocRef.id, timestamp: Date.now() });
            localStorage.setItem('newEntries', JSON.stringify(newEntries));

            toast({
                title: "Sukses",
                description: "Data pelayanan berhasil disimpan.",
            });
            
            router.push('/laporan');
          })
          .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: newDocRef.path,
              operation: 'create',
              requestResourceData: serviceData,
            }));
            toast({
              variant: "destructive",
              title: "Gagal Menyimpan",
              description: "Terjadi kesalahan saat menyimpan data. Silakan coba lagi.",
            });
          })
          .finally(() => {
            setIsSubmitting(false);
          });
    }
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardContent className="p-4">
              <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Pelayanan</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="w-full"
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              field.onChange(parseISO(dateValue));
                            } else {
                              field.onChange(null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <FormField
                  control={form.control}
                  name="puskeswan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puskeswan</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('ownerAddress', ''); 
                          setShowManualOwnerAddress(false);
                          form.setValue('officerName', '');
                          setShowManualOfficerName(false);
                        }}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Puskeswan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {puskeswanList.map((puskeswan) => (
                            <SelectItem key={puskeswan} value={puskeswan}>{puskeswan}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <FormField
                  control={form.control}
                  name="officerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Petugas</FormLabel>
                        <>
                          {isOfficerSelection && !showManualOfficerName ? (
                            <Select
                              onValueChange={(value) => {
                                if (value === 'Lainnya') {
                                  setShowManualOfficerName(true);
                                  field.onChange('');
                                } else {
                                  field.onChange(value);
                                }
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih Nama Petugas" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {officerList.map((officer) => (
                                  <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input 
                                placeholder="Nama Petugas" 
                                {...field} 
                                value={(showManualOfficerName && field.value === 'Lainnya') ? '' : field.value}
                              />
                            </FormControl>
                          )}
                        </>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Pemilik</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Budi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                 <FormField
                  control={form.control}
                  name="ownerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat Pemilik</FormLabel>
                      {(isDesaSelection && !showManualOwnerAddress) ? (
                        <Select 
                            onValueChange={(value) => {
                                if (value === 'Lainnya') {
                                    setShowManualOwnerAddress(true);
                                    field.onChange('');
                                } else {
                                    field.onChange(value);
                                }
                            }}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Desa" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {desaList.map((desa) => (
                                    <SelectItem key={desa} value={desa}>{desa}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                            <Input 
                                placeholder="Alamat Desa, Contoh : Salopangkang" 
                                {...field}
                                value={(showManualOwnerAddress && field.value === 'Lainnya') ? '' : field.value}
                             />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIK KTP <span className="text-xs italic font-normal text-muted-foreground">(Opsional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 7604..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. HP <span className="text-xs italic font-normal text-muted-foreground">(Opsional)</span></FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Contoh: 0812..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="vaccinationProgram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Vaksinasi</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('vaccineName', '');
                            setShowManualVaccineName(false);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Program Vaksinasi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vaccinationPrograms.map((program) => (
                              <SelectItem key={program} value={program}>{program}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vaccineName"
                    render={({ field }) => {
                      const vaccineOptions = vaccineLists[watchedVaccinationProgram] || [];
                      const isManualInput = showManualVaccineName || watchedVaccinationProgram === 'Lainnya' || (watchedVaccinationProgram !== '' && vaccineOptions.length === 0);

                      return (
                        <FormItem>
                          <FormLabel>Jenis Vaksin</FormLabel>
                          {isManualInput ? (
                            <FormControl>
                              <Input
                                placeholder="Isi jenis vaksin"
                                {...field}
                              />
                            </FormControl>
                          ) : (
                            <Select
                              onValueChange={(value) => {
                                if (value === 'Lainnya') {
                                  setShowManualVaccineName(true);
                                  field.onChange('');
                                } else {
                                  field.onChange(value);
                                }
                              }}
                              value={field.value}
                              disabled={!watchedVaccinationProgram}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={watchedVaccinationProgram ? "Pilih Jenis Vaksin" : "Pilih Program Terlebih Dahulu"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vaccineOptions.map((vaccine) => (
                                  <SelectItem key={vaccine} value={vaccine}>{vaccine}</SelectItem>
                                ))}
                                <SelectItem value="Lainnya">Lainnya (Input Manual)</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>
          </div>

          <div className="space-y-4 md:space-y-6">
             <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label>
                      Detail Hewan
                      <span className="ml-2 text-xs italic font-normal text-muted-foreground">
                        (Informasi ternak yang divaksinasi)
                      </span>
                    </Label>
                  </div>
                  {vaccinationFields.map((item, index) => (
                    <Card key={item.id} className="relative p-4 bg-card">
                      {vaccinationFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-6 w-6"
                          onClick={() => removeVaccination(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <div className="flex flex-col gap-4">
                        <FormField
                          control={form.control}
                          name={`vaccinations.${index}.animalType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jenis Hewan</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih Jenis" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {livestockTypes.map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`vaccinations.${index}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jenis Kelamin <span className="text-xs italic font-normal text-muted-foreground">(Opsional)</span></FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih Kelamin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {genderOptions.map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                              control={form.control}
                              name={`vaccinations.${index}.age`}
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Umur <span className="text-xs italic font-normal text-muted-foreground">(Opsional)</span></FormLabel>
                                  <FormControl>
                                  <Input
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                  />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name={`vaccinations.${index}.ageUnit`}
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="opacity-0">Unit</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                      <SelectTrigger>
                                      <SelectValue placeholder="Unit" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {ageUnits.map((unit) => (
                                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                      ))}
                                  </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`vaccinations.${index}.animalCount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jumlah</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Jumlah"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                  <div className="flex justify-start">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        appendVaccination({ vaccineName: '', animalType: '', animalCount: 1, gender: '', age: '', ageUnit: 'Tahun' });
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Tambah Hewan
                    </Button>
                  </div>
                  <FormMessage>{form.formState.errors.vaccinations?.message}</FormMessage>
                </div>
              </CardContent>
            </Card>

             {formType !== 'vaksinasi' && (
                <Card>
                <CardContent className="p-4">
                    <div className="space-y-4">
                    <div>
                        <Label>
                        Pengobatan
                        <span className="ml-2 text-xs italic font-normal text-muted-foreground">
                            (Isi jenis dan nama obat secara manual)
                        </span>
                        </Label>
                    </div>

                    {treatmentFields.map((item, index) => {
                        const dosageUnitValue = form.watch(`treatments.${index}.dosageUnit`);
                        const isManualDosageUnit = dosageUnitValue === 'Lainnya';

                        return (
                        <Card key={item.id} className="relative p-4 bg-card">
                            {treatmentFields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-1 -right-1 h-6 w-6"
                                    onClick={() => removeTreatment(index)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                            <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name={`treatments.${index}.medicineType`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Jenis Obat</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Contoh: Antibiotik" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`treatments.${index}.medicineName`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nama Obat</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Contoh: Limoxin" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <FormLabel>Dosis <span className="italic font-normal text-muted-foreground text-xs">(Isi Total Dosis Jika Lebih Dari 1 Ekor)</span></FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name={`treatments.${index}.dosageValue`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input type="number" step="0.001" placeholder="Jumlah" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`treatments.${index}.dosageUnit`}
                                    render={({ field }) => (
                                    <FormItem>
                                        {isManualDosageUnit ? (
                                        <FormControl>
                                            <Input
                                                placeholder="Satuan"
                                                {...field}
                                                value={field.value === 'Lainnya' ? '' : field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            />
                                            </FormControl>
                                        ) : (
                                        <Select
                                            onValueChange={(value) => {
                                            if (value === 'Lainnya') {
                                                field.onChange('Lainnya');
                                            } else {
                                                field.onChange(value);
                                            }
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Satuan" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            {dosageUnits.map((unit) => (
                                                <SelectItem key={unit} value={unit}>
                                                {unit}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                            </div>
                            </div>
                        </Card>
                        )
                    })}
                    <div className="flex justify-start">
                        <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => appendTreatment({ medicineType: "", medicineName: "", dosageValue: 0, dosageUnit: "ml" }, { shouldFocus: false })}
                        >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah
                        </Button>
                    </div>
                    </div>
                </CardContent>
                </Card>
            )}
            {formType !== 'vaksinasi' && (
              <Card>
                  <CardContent className="p-4">
                      <div className="space-y-4">
                      <div>
                          <Label>
                            Perkembangan Kasus
                              <span className="ml-2 text-xs italic font-normal text-muted-foreground">
                                (Perkirakan Presentase Kondisi Hewan Sehingga Dapat Diisi Di Awal)
                              </span>
                          </Label>
                      </div>

                      {caseDevelopmentFields.map((item, index) => (
                          <Card key={item.id} className="relative p-4 bg-card">
                          {caseDevelopmentFields.length > 1 && (
                              <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute -top-1 -right-1 h-6 w-6"
                              onClick={() => removeCaseDevelopment(index)}
                              >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                              <FormField
                              control={form.control}
                              name={`caseDevelopments.${index}.count`}
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Jumlah</FormLabel>
                                  <FormControl>
                                      <Input
                                      type="number"
                                      placeholder="Jumlah"
                                      {...field}
                                      onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                      />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />
                              <FormField
                              control={form.control}
                              name={`caseDevelopments.${index}.status`}
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Keterangan</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Pilih Status" />
                                      </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                      {caseStatusOptions.map((option) => (
                                          <SelectItem key={option} value={option}>
                                          {option}
                                          </SelectItem>
                                      ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />
                          </div>
                          </Card>
                      ))}
                      <div className="flex justify-start">
                          <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => appendCaseDevelopment({ status: "", count: 1 }, { shouldFocus: false })}
                          >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Tambah
                          </Button>
                      </div>
                      <FormMessage>{form.formState.errors.caseDevelopments?.message}</FormMessage>
                      </div>
                  </CardContent>
              </Card>
            )}
          </div>
        </div>
        {showSubmitButton && (
          <div className="flex justify-start md:justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Data'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}