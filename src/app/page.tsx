
'use client';

import { useState } from 'react';
import { ServiceForm } from "@/components/service-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExcelUpload } from '@/components/excel-upload';

export default function Home() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const linkToCopy = "http://vaksinasi.vercel.app";

  const handleCopy = () => {
    navigator.clipboard.writeText(linkToCopy).then(() => {
      setCopied(true);
      toast({
        title: "Disalin!",
        description: "Tautan berhasil disalin ke clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Gagal menyalin: ', err);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Tidak dapat menyalin tautan.",
      });
    });
  };

  return (
    <div className="container px-3 sm:px-8 py-4 md:py-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <Card>
          <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Pelayanan Vaksinasi</CardTitle>
              <CardDescription className="text-muted-foreground pt-2 text-sm md:text-base">
              Input detail vaksinasi yang telah dilakukan
              </CardDescription>
              <div className="flex items-center gap-2">
                  <a href={linkToCopy} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 italic underline text-sm">
                      {linkToCopy}
                  </a>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopy}
                  >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Salin tautan</span>
                  </Button>
              </div>
          </CardHeader>
        </Card>
        
        <div>
          <ServiceForm 
            formType="vaksinasi" 
            showSubmitButton={false} 
            formId="main-keswan-form"
            onSubmittingChange={setIsFormSubmitting}
          />
        </div>

        <div>
          <ExcelUpload />
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            form="main-keswan-form" 
            size="lg"
            className="w-fit md:w-auto md:min-w-[200px]"
            disabled={isFormSubmitting}
          >
            {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Data
          </Button>
        </div>
      </div>
    </div>
  );
}
