
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Download, Upload, Zap, Sparkles, AlertCircle, Loader2, Wand2, PartyPopper } from 'lucide-react';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';


const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Vintage', 'Urban', 'Futuristic', 'Eco-Natural', 'Sporty', 'Luxury', 'Geometric'];
const MAX_INITIAL_GENERATIONS = 5;
const MAX_IMPROVEMENT_GENERATIONS = 5;

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
  const [limitMessage, setLimitMessage] = useState('');
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [critique, setCritique] = useState('');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [initialGenerationsCount, setInitialGenerationsCount] = useState(0);
  const [improvementGenerationsCount, setImprovementGenerationsCount] = useState(0);
  
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
    setShowWelcomeDialog(true);
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
    if (initialGenerationsCount >= MAX_INITIAL_GENERATIONS) {
      setLimitMessage(`You have reached the limit of ${MAX_INITIAL_GENERATIONS} initial mockup generations.`);
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
        setInitialGenerationsCount(prev => prev + 1);
        setStatusMessage('Brand identity successfully generated! Review and download your high-resolution mockups.');
        setCurrentImageIndex(0);
        
        setTimeout(() => {
            carouselApi?.scrollTo(0);
        }, 100);

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

  const handleImproveClick = () => {
    if (generatedImageUrls.length > 0) {
      setShowImproveDialog(true);
    } else {
      setError("Generate an image before you can improve it.");
    }
  };
  
  const onImprove = async () => {
    if (improvementGenerationsCount >= MAX_IMPROVEMENT_GENERATIONS) {
      setLimitMessage(`You have reached the limit of ${MAX_IMPROVEMENT_GENERATIONS} improvement generations.`);
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
    setShowImproveDialog(false);
    
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
            critique: critique || "Generate a new composition. Try a different camera angle, change the product placement, or alter the background studio setting. Be creative."
        }, userId);

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.imageUrl) {
            const newImageIndex = generatedImageUrls.length;
            setGeneratedImageUrls(prev => [...prev, result.imageUrl]);
            setImprovementGenerationsCount(prev => prev + 1);
            setStatusMessage('Successfully generated an improved mockup!');
            setCritique('');
            
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
  
  const isGenerateDisabled = isLoading || !logoFile || isImproving || initialGenerationsCount >= MAX_INITIAL_GENERATIONS; 
  const isImproveDisabled = isLoading || isImproving || generatedImageUrls.length === 0 || improvementGenerationsCount >= MAX_IMPROVEMENT_GENERATIONS;
  const currentImageUrl = generatedImageUrls.length > 0 ? generatedImageUrls[currentImageIndex] : null;

  return (
    <div className="relative min-h-screen flex flex-col px-4 sm:px-6 md:px-8 font-body text-foreground">

      <header className="text-center py-2">
        <div className="flex items-center justify-center space-x-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="hsl(var(--primary))" stroke="none" />
            <path d="M2 17l10 5 10-5" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
            <path d="M2 12l10 5 10-5" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
             <path d="M12 22V12" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
             <path d="M22 7v10" stroke="hsl(var(--primary))" strokeWidth="1.5" />
             <path d="M2 7v10" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          </svg>
          <span className="text-5xl font-semibold text-primary">Mocksy</span>
        </div>
        <p className="mt-1 text-foreground text-base font-regular">
          AI-Powered Brand Identity Mockups Generator
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto flex-grow w-full pb-2">
        <Card className="lg:col-span-1 glass-card rounded-2xl flex flex-col">
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 flex flex-col flex-grow">
              <h2 className="text-lg font-semibold text-card-foreground mb-3">Brand Definition</h2>
              
              <div className="space-y-3 flex-grow">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-sm">Brand/Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hello AI" {...field} className="h-10 bg-input/50 border-border rounded-lg" />
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
                      <FormLabel className="font-medium text-sm">Upload Logo Image <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <div 
                          className="mt-1 flex justify-center px-4 py-2 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/80 transition bg-input/50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <div className="space-y-1 text-center">
                              {logoPreviewUrl ? (
                                <div className='relative w-24 h-10 mx-auto'>
                                  <Image src={logoPreviewUrl} alt="Logo Preview" fill objectFit="contain" />
                                </div>
                              ) : (
                                <>
                                  <Upload className="mx-auto h-5 w-5 text-muted-foreground/50" />
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
                      <FormLabel className="font-medium text-sm">Merchandise Items (Comma Separated) <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., paper bag, hat, mug" {...field} className="h-10 bg-input/50 border-border rounded-lg" />
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
                      <FormLabel className="font-medium text-sm">Main Color Theme <span className="text-primary">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Violet or #E2E2E2" {...field} className="h-10 bg-input/50 border-border rounded-lg"/>
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
                      <FormLabel className="font-medium text-sm">Design Style <span className="text-primary">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-input/50 border-border rounded-lg">
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

              <div className='!mt-auto pt-3 text-center'>
                <Button type="submit" disabled={isGenerateDisabled} className="w-full text-base font-medium py-5 transition-transform transform hover:scale-[1.02] active:scale-[0.98] rounded-lg bg-primary text-primary-foreground">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  <span>{isLoading ? 'Generating...' : 'Generate Mockups'}</span>
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">{initialGenerationsCount}/{MAX_INITIAL_GENERATIONS} generations used</p>
              </div>
            </form>
          </Form>
        </Card>

        <Card className="lg:col-span-2 p-4 flex flex-col glass-card rounded-2xl">
           <h2 className="text-lg font-semibold text-card-foreground mb-2">Generated Mockups</h2>
          
            <div className="min-h-10 mb-2">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!error && statusMessage && (
                    <div className="px-4 py-2 rounded-lg text-sm bg-primary/20 text-primary-foreground font-medium">
                        <p>{statusMessage}</p>
                    </div>
                )}
            </div>
            
            <div className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden flex-grow flex items-center justify-center bg-input/50">
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
                <div className="p-0 flex-grow relative w-full h-full">
                  <Image
                      src={currentImageUrl}
                      alt="Generated Brand Identity Mockup"
                      fill
                      className="object-contain rounded-lg"
                  />
                </div>
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
              <div className="flex items-center justify-between space-x-2 mt-2">
                  <div className="relative flex-grow max-w-lg">
                      <Carousel setApi={setCarouselApi} opts={{align: "start"}} className="w-full">
                          <CarouselContent className="-ml-1">
                          {generatedImageUrls.map((url, index) => (
                              <CarouselItem key={index} className="basis-1/5 md:basis-1/6 pl-1">
                              <div className="p-0.5">
                                  <Card 
                                  className={`overflow-hidden cursor-pointer transition-all bg-input/50 aspect-square rounded-[6px] ${index === currentImageIndex ? 'border-primary border-2' : 'border-border'}`}
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
                      </Carousel>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-center">
                    <div>
                        <Button onClick={handleImproveClick} disabled={isImproveDisabled} className="font-medium rounded-[6px]">
                            <Wand2 className="mr-2 h-5 w-5" />
                            Improve
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">{improvementGenerationsCount}/{MAX_IMPROVEMENT_GENERATIONS} used</p>
                    </div>
                    <Button onClick={downloadImage} variant="outline" className="font-medium rounded-[6px] bg-card/50 border-border hover:bg-input/50 hover:text-foreground self-start">
                        <Download className="mr-2 h-5 w-5" />
                        Download
                    </Button>
                  </div>
              </div>
            )}
        </Card>
      </main>

        <footer className="text-left text-xs text-muted-foreground py-2">
          <p>
            Created by{' '}
            <a
              href="https://www.linkedin.com/in/adityaarora20/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @AdityaArora
            </a>
          </p>
        </footer>

        <AlertDialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
            <AlertDialogContent className="glass-card rounded-[10px] max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3 text-2xl font-semibold">
                        <PartyPopper className="text-primary w-8 h-8" />
                        Welcome to Mocksy!
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="text-base text-muted-foreground pt-4 space-y-4">
                           <p>1. Welcome to the brand mockup generator! Just drop your logo and watch the magic happen.</p>
                           <p>2. This is an experimental project and we're still building it, so some things might not work perfectly just yet.</p>
                           <p>3. Hope you enjoy it, and thank you for being an early user!</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="!mt-8">
                    <AlertDialogAction className="w-full text-base py-5 rounded-lg" onClick={() => setShowWelcomeDialog(false)}>
                        Get Started
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Generation Limit Reached</AlertDialogTitle>
                <AlertDialogDescription>
                    {limitMessage} This is an experimental project, and for now, you can generate up to {MAX_INITIAL_GENERATIONS} mockups and {MAX_IMPROVEMENT_GENERATIONS} improvements. Thank you for trying out Mocksy!
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowLimitDialog(false)}>
                    Understood
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Improve Your Mockup</AlertDialogTitle>
              <AlertDialogDescription>
                Tell the AI what you'd like to change. Be specific! For example, "Make the background darker," or "Use a different font for the text."
                <br /><br />
                <span className='text-xs text-muted-foreground'>
                    <b>Note:</b> This feature is experimental. You can also leave this blank and click "Regenerate" to let the AI try a completely new idea.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                id="critique"
                placeholder="e.g., Change the mug to a t-shirt and make the style more minimalist."
                value={critique}
                onChange={(e) => setCritique(e.target.value)}
                className="w-full"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCritique('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onImprove}>
                {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
