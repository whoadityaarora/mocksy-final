'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { signInAnonymously, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { generateIdentityAction, suggestImprovementsAction, getUserUsage } from '@/app/actions';
import { brandFormSchema } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Download, Upload, Zap, Sparkles, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import Image from 'next/image';


const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Vintage', 'Urban', 'Futuristic', 'Eco-Natural', 'Sporty', 'Luxury', 'Geometric'];
const MAX_GENERATIONS = 5;

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Upload your logo and define the brand identity unputs.');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof brandFormSchema>>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      brandName: '',
      mainColor: '',
      style: '',
      merchandise: '',
      logoFile: undefined,
    },
  });

  const logoFile = form.watch('logoFile');
  
  // const fetchUsage = useCallback(async (id: string) => {
  //   const count = await getUserUsage(id);
  //   setUsageCount(count);
  //   if (count >= MAX_GENERATIONS) {
  //     setStatusMessage(`You've reached your limit of ${MAX_GENERATIONS} mockups.`);
  //   }
  // }, []);


  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setLogoPreviewUrl(null);
      };
    }
  }, [logoFile]);

  useEffect(() => {
    const signIn = async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;
        setUserId(uid);
        // fetchUsage(uid);
      } catch (authError) {
        const firebaseError = authError as AuthError;
        if (firebaseError.code === 'auth/operation-not-allowed' || firebaseError.code === 'auth/configuration-not-found') {
          console.warn(
            "Firebase Anonymous Authentication is not enabled. Using a fallback temporary user ID. To persist user data, please enable Anonymous Sign-In in your Firebase project's Authentication settings."
          );
        } else {
          console.error('Firebase authentication failed:', firebaseError);
        }
        const fallbackId = crypto.randomUUID();
        setUserId(fallbackId);
        // fetchUsage(fallbackId);
      }
    };
    signIn();
  }, []);
  
  useEffect(() => {
    if (!carouselApi) return;
    
    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
    
  }, [carouselApi]);

  const onSubmit = async (values: z.infer<typeof brandFormSchema>) => {
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrls([]); // Clear previous results
    setStatusMessage('Generating cohesive brand identity mockups...');
    setCurrentImageIndex(0);

    try {
      const result = await generateIdentityAction(values, userId);

      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.imageUrl) {
        setGeneratedImageUrls(prev => [...prev, result.imageUrl]);
        setStatusMessage('Brand identity successfully generated! Review and download your high-resolution mockups.');
        carouselApi?.scrollTo(0);
      } else {
        throw new Error("The AI model did not return an image.");
      }
      
      // if(userId) fetchUsage(userId);

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(`Failed to generate image. Error: ${errorMessage}. Please check your inputs or try again.`);
      setStatusMessage('Generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const onImprove = async () => {
    const currentImageUrl = generatedImageUrls[currentImageIndex];
    if (!currentImageUrl) return;

    setIsImproving(true);
    setError(null);
    
    try {
      const values = form.getValues();
      const result = await suggestImprovementsAction({
        brandName: values.brandName ?? 'brand',
        mainColor: values.mainColor,
        style: values.style,
        merchandise: values.merchandise,
        generatedImageUrl: currentImageUrl,
      });

      if (result.error) {
        throw new Error(result.error);
      }
      setImprovements(result.improvements ?? 'No suggestions available.');

    } catch (e: any) {
       const errorMessage = e.message || "An unexpected error occurred.";
       setError(`Failed to get suggestions. Error: ${errorMessage}.`);
    } finally {
      setIsImproving(false);
    }
  };

  const downloadImage = useCallback(() => {
    const currentImageUrl = generatedImageUrls[currentImageIndex];
    if (currentImageUrl) {
      const link = document.createElement('a');
      link.href = currentImageUrl;
      link.download = `${(form.getValues('brandName') || 'brand').toLowerCase().replace(/\s/g, '_')}_mockup.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [generatedImageUrls, currentImageIndex, form]);
  
  const isGenerateDisabled = isLoading || !logoFile; 
  const currentImageUrl = generatedImageUrls.length > 0 ? generatedImageUrls[currentImageIndex] : null;

  return (
    <div className="relative min-h-screen bg-transparent p-4 sm:p-8 font-body text-foreground">

      <header className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2">
            <Image src="/logo.png" alt="Mocksy Logo" width={48} height={48} />
            <span className="text-4xl font-bold"> Mocksy</span>
        </div>
        <p className="mt-2 text-muted-foreground text-sm">
          AI-Powered Brand Identity Mockups Generator
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <Card className="lg:col-span-1 h-fit bg-card border-border rounded-2xl shadow-[0_0_20px_rgba(255,140,0,0.1)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
              <h2 className="text-2xl font-bold text-card-foreground">Brand Definition</h2>
              
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand/Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hello AI" {...field} className="bg-input border-border rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoFile"
                render={({ field: { onChange } }) => (
                  <FormItem>
                    <FormLabel>Upload Logo Image <span className="text-primary">*</span></FormLabel>
                    <FormControl>
                      <div 
                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/80 transition bg-input"
                        onClick={() => fileInputRef.current?.click()}
                      >
                         <div className="space-y-1 text-center">
                            {logoPreviewUrl ? (
                              <div className='relative w-40 h-24 mx-auto'>
                                <Image src={logoPreviewUrl} alt="Logo Preview" fill objectFit="contain" />
                              </div>
                            ) : (
                              <>
                                <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
                                <div className="flex text-sm text-muted-foreground">
                                    <span className="font-medium text-primary hover:text-primary/80">
                                      Click/Drag to upload Logo
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground/70">PNG/JPG up to 5MB</p>
                              </>
                            )}
                            <input 
                              ref={fileInputRef} 
                              type="file" 
                              className="sr-only" 
                              accept="image/png, image/jpeg, image/jpg, image/webp, image/heic"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    onChange(file);
                                }
                              }}
                            />
                         </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="merchandise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchandise Items (Comma Separated) <span className="text-primary">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., paper bag, hat, mug" {...field} className="bg-input border-border rounded-lg" />
                    </FormControl>
                    <p className="mt-1 text-xs text-muted-foreground/70">List 3-5 items for best result</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mainColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Color Theme <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Violet or #E2E2E2" {...field} className="bg-input border-border rounded-lg"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Design Style <span className="text-primary">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-input border-border rounded-lg">
                              <SelectValue placeholder="Select a Design style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STYLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='!mt-8 space-y-2'>
                <Button type="submit" disabled={isGenerateDisabled} className="w-full text-base font-semibold py-6 transition-transform transform hover:scale-[1.02] active:scale-[0.98] rounded-lg bg-primary text-primary-foreground">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  <span>{isLoading ? 'Generating...' : 'Generate Mockups'}</span>
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        <Card className="lg:col-span-2 p-6 sm:p-8 flex flex-col bg-card border-border rounded-2xl shadow-[0_0_20px_rgba(255,140,0,0.1)]">
           <h2 className="text-2xl font-bold text-card-foreground mb-4">Generated Mockups</h2>
          
            <div className="min-h-12 mb-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!error && statusMessage && (
                    <div className="px-4 py-3 rounded-lg text-sm bg-primary/10 text-primary">
                        <p>{statusMessage}</p>
                    </div>
                )}
            </div>

            <div className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden flex-grow min-h-[400px] flex items-center justify-center bg-input p-4">
              {isLoading && (
                   <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="text-center">
                          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                          <p className="mt-4 text-primary font-medium text-lg">
                              AI is crafting your brand identity...
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                              This may take a moment.
                          </p>
                      </div>
                  </div>
              )}
              {currentImageUrl && !isLoading ? (
                  <img
                      src={currentImageUrl}
                      alt="Generated Brand Identity Mockup"
                      className="max-w-full max-h-full object-contain rounded-lg"
                  />
              ) : !isLoading && (
                  <div className="text-center text-muted-foreground p-10">
                      <Sparkles className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                      <p className="text-lg font-semibold">
                          Your masterpiece will appear here.
                      </p>
                  </div>
              )}
            </div>
            
            {generatedImageUrls.length > 1 && !isLoading && (
              <div className="relative w-full p-4 mt-4">
                 <Carousel setApi={setCarouselApi} opts={{align: "start"}} className="w-full">
                    <CarouselContent className="-ml-2">
                      {generatedImageUrls.map((url, index) => (
                        <CarouselItem key={index} className="basis-1/4 pl-2">
                          <div className="p-1">
                            <Card 
                              className={`overflow-hidden cursor-pointer transition-all bg-input aspect-square ${index === currentImageIndex ? 'border-primary border-2' : 'border-border'}`}
                              onClick={() => carouselApi?.scrollTo(index)}
                            >
                              <div className="relative aspect-square">
                                <Image
                                  src={url}
                                  alt={`Generated Mockup ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </Card>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="bg-card border-border hover:bg-input"/>
                    <CarouselNext className="bg-card border-border hover:bg-input"/>
                  </Carousel>
              </div>
            )}
            
            {currentImageUrl && !isLoading && (
                <div className="flex justify-center space-x-4 mt-4">
                    <Button onClick={onImprove} disabled={isImproving} className="shadow-lg transition-transform transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground rounded-lg px-6 py-5 font-semibold">
                        {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        <span>Improve</span>
                    </Button>
                    <Button onClick={downloadImage} variant="outline" className="shadow-lg transition-transform transform hover:scale-105 active:scale-95 bg-card border-border hover:bg-input hover:text-foreground rounded-lg px-6 py-5 font-semibold">
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download File</span>
                    </Button>
                </div>
            )}
        </Card>
      </main>

      <AlertDialog open={!!improvements} onOpenChange={(open) => !open && setImprovements(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brand Improvement Suggestions</AlertDialogTitle>
            <AlertDialogDescription>
              Here are some AI-powered suggestions to further enhance your brand identity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            readOnly
            value={improvements ?? ''}
            className="my-4 h-48 bg-muted/50"
          />
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImprovements(null)}>Got it!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    