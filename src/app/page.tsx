
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { signInAnonymously, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { generateIdentityAction, regenerateIdentityAction } from '@/app/actions';
import { brandFormSchema } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Download, Upload, Zap, Sparkles, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import Image from 'next/image';


const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Vintage', 'Urban', 'Futuristic', 'Eco-Natural', 'Sporty', 'Luxury', 'Geometric'];
const MAX_GENERATIONS = 5;

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Upload your logo and define the brand identity unputs.');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  
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
      }
    };
    signIn();
  }, []);
  
  useEffect(() => {
    if (!carouselApi) return;
    
    const handleSelect = () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on("select", handleSelect);
    
    return () => {
      carouselApi.off("select", handleSelect);
    };
    
  }, [carouselApi]);

  const handleThumbnailClick = (index: number) => {
    if (carouselApi) {
      carouselApi.scrollTo(index);
    }
    setCurrentImageIndex(index);
  };

  const onSubmit = async (values: z.infer<typeof brandFormSchema>) => {
    if (generatedImageUrls.length >= MAX_GENERATIONS) {
      setShowLimitDialog(true);
      return;
    }

    setGeneratedImageUrls([]); // Clear previous results
    setIsLoading(true);
    setError(null);
    setStatusMessage('Generating cohesive brand identity mockups...');
    setCurrentImageIndex(0);

    try {
      const result = await generateIdentityAction(values, userId);

      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.imageUrl) {
        setGeneratedImageUrls(prev => [result.imageUrl]);
        setStatusMessage('Brand identity successfully generated! Review and download your high-resolution mockups.');
        setCurrentImageIndex(0);
        carouselApi?.scrollTo(0);
      } else {
        throw new Error("The AI model did not return an image.");
      }

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(`Failed to generate image. Error: ${errorMessage}. Please check your inputs or try again.`);
      setStatusMessage('Generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const onImprove = async () => {
    if (generatedImageUrls.length >= MAX_GENERATIONS) {
      setShowLimitDialog(true);
      return;
    }
    const currentImageUrl = generatedImageUrls[currentImageIndex];
    if (!currentImageUrl || !logoFile) {
        setError("Cannot improve without a generated image and a logo.");
        return;
    };

    setIsImproving(true);
    setError(null);
    setStatusMessage('Applying AI suggestions to generate an improved mockup...');
    
    try {
        const values = form.getValues();
        const arrayBuffer = await logoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const logoDataUri = `data:${logoFile.type};base64,${buffer.toString("base64")}`;

        const result = await regenerateIdentityAction({
            brandName: values.brandName ?? 'brand',
            mainColor: values.mainColor,
            style: values.style,
            merchandise: values.merchandise,
            previousImageUrl: currentImageUrl,
            logoDataUri: logoDataUri,
            critique: "Improve the previous image based on these details. Try a different composition or angle."
        }, userId);

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.imageUrl) {
            const newImageIndex = generatedImageUrls.length;
            setGeneratedImageUrls(prev => [...prev, result.imageUrl]);
            setStatusMessage('Successfully generated an improved mockup!');
            
            setTimeout(() => {
                carouselApi?.scrollTo(newImageIndex);
                setCurrentImageIndex(newImageIndex);
            }, 100);
        } else {
            throw new Error("The AI model did not return an improved image.");
        }

    } catch (e: any) {
       const errorMessage = e.message || "An unexpected error occurred.";
       setError(`Failed to generate improvement. Error: ${errorMessage}.`);
       setStatusMessage('Improvement failed.');
    } finally {
      setIsImproving(false);
    }
  };

  const downloadImage = useCallback(() => {
    const currentImageUrl = generatedImageUrls[currentImageIndex];
    if (currentImageUrl) {
      const link = document.createElement('a');
      link.href = currentImageUrl;
      link.download = `${(form.getValues('brandName') || 'brand').toLowerCase().replace(/\s/g, '_')}_mockup_${currentImageIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [generatedImageUrls, currentImageIndex, form]);
  
  const isGenerateDisabled = isLoading || !logoFile || isImproving; 
  const isImproveDisabled = isLoading || isImproving || generatedImageUrls.length === 0;
  const currentImageUrl = generatedImageUrls.length > 0 ? generatedImageUrls[currentImageIndex] : null;

  return (
    <div className="relative h-screen flex flex-col pt-2 px-8 pb-4 sm:px-6 sm:pb-6 md:px-8 md:pb-8 font-body text-foreground">

      <header className="text-center py-2">
        <div className="flex items-center justify-center space-x-2">
            <svg
              className="h-14 w-14 text-primary"
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 12.5L15.5 10.5L19 12.5V15.5L15.5 17.5L12 15.5V12.5ZM5 12.5L8.5 10.5L12 12.5V15.5L8.5 17.5L5 15.5V12.5ZM12 4.5L19 8.5L12 12.5L5 8.5L12 4.5Z"
                stroke="hsl(var(--background))"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-5xl font-semibold text-primary">Mocksy</span>
        </div>
        <p className="mt-1 text-muted-foreground text-lg font-regular">
          AI-Powered Brand Identity Mockups Generator
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto flex-grow w-full pb-2">
        <Card className="lg:col-span-1 glass-card rounded-2xl flex flex-col">
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-col flex-grow">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Brand Definition</h2>
              
              <div className="space-y-4 flex-grow">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Brand/Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hello AI" {...field} className="bg-input/50 border-border rounded-lg" />
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
                      <FormLabel className="font-medium">Upload Logo Image <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <div 
                          className="mt-1 flex justify-center px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/80 transition bg-input/50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <div className="space-y-1 text-center">
                              {logoPreviewUrl ? (
                                <div className='relative w-28 h-12 mx-auto'>
                                  <Image src={logoPreviewUrl} alt="Logo Preview" fill objectFit="contain" />
                                </div>
                              ) : (
                                <>
                                  <Upload className="mx-auto h-6 w-6 text-muted-foreground/50" />
                                  <div className="flex text-xs text-muted-foreground">
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
                      <FormLabel className="font-medium">Merchandise Items (Comma Separated) <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., paper bag, hat, mug" {...field} className="bg-input/50 border-border rounded-lg" />
                      </FormControl>
                      <p className="mt-1 text-xs text-muted-foreground/70 font-regular">List 3-5 items for best result</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mainColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Main Color Theme <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Violet or #E2E2E2" {...field} className="bg-input/50 border-border rounded-lg"/>
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
                      <FormLabel className="font-medium">Design Style <span className="text-primary">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-input/50 border-border rounded-lg">
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

              <div className='!mt-auto pt-4'>
                <Button type="submit" disabled={isGenerateDisabled} className="w-full text-base font-medium py-5 transition-transform transform hover:scale-[1.02] active:scale-[0.98] rounded-lg bg-primary text-primary-foreground">
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

        <Card className="lg:col-span-2 p-4 flex flex-col glass-card rounded-2xl">
           <h2 className="text-xl font-semibold text-card-foreground mb-4">Generated Mockups</h2>
          
            <div className="min-h-12 mb-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!error && statusMessage && (
                    <div className="px-4 py-3 rounded-lg text-sm bg-primary/20 text-primary-foreground font-medium">
                        <p>{statusMessage}</p>
                    </div>
                )}
            </div>
            
            <div className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden flex-grow flex items-center justify-center bg-input/50 p-4">
              {(isLoading || isImproving) && (
                   <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="text-center">
                          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                          <p className="mt-4 text-primary font-semibold text-lg">
                              {isLoading ? 'AI is crafting your brand identity...' : 'AI is improving your mockup...'}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground font-regular">
                              This may take a moment.
                          </p>
                      </div>
                  </div>
              )}
              {currentImageUrl && !isLoading && !isImproving ? (
                  <Image
                      src={currentImageUrl}
                      alt="Generated Brand Identity Mockup"
                      fill
                      className="object-contain rounded-lg"
                  />
              ) : !isLoading && !isImproving && (
                  <div className="text-center text-muted-foreground p-10">
                      <Sparkles className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                      <p className="text-lg font-medium">
                          Your masterpiece will appear here.
                      </p>
                  </div>
              )}
            </div>
            
            {generatedImageUrls.length > 0 && !isLoading && (
              <div className="flex items-center justify-center space-x-4 mt-4">
                  <div className="relative flex-grow max-w-lg">
                      <Carousel setApi={setCarouselApi} opts={{align: "start"}} className="w-full">
                          <CarouselContent className="-ml-2">
                          {generatedImageUrls.map((url, index) => (
                              <CarouselItem key={index} className="basis-1/4 md:basis-1/5 pl-2">
                              <div className="p-1">
                                  <Card 
                                  className={`overflow-hidden cursor-pointer transition-all bg-input/50 aspect-square ${index === currentImageIndex ? 'border-primary border-2' : 'border-border'}`}
                                  onClick={() => handleThumbnailClick(index)}
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
                          <CarouselPrevious className="bg-card/50 border-border hover:bg-input/50 left-2"/>
                          <CarouselNext className="bg-card/50 border-border hover:bg-input/50 right-2"/>
                      </Carousel>
                  </div>
                  
                  <Button onClick={onImprove} disabled={isImproveDisabled} className="shadow-lg transition-transform transform hover:scale-105 active:scale-95 rounded-full px-6 py-5 font-medium">
                      {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      <span>Improve</span>
                  </Button>
                  <Button onClick={downloadImage} variant="outline" className="shadow-lg transition-transform transform hover:scale-105 active:scale-95 bg-card/50 border-border hover:bg-input/50 hover:text-foreground rounded-full px-6 py-5 font-medium">
                      <Download className="mr-2 h-4 w-4" />
                      <span>Download</span>
                  </Button>
              </div>
            )}
        </Card>
      </main>

        <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Generation Limit Reached</AlertDialogTitle>
                <AlertDialogDescription>
                    This is an experimental project, and for now, you can generate up to {MAX_GENERATIONS} mockups (including improvements). Thank you for trying out Mocksy!
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowLimitDialog(false)}>
                    Understood
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
