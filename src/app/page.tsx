'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { signInAnonymously, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { generateIdentityAction, suggestImprovementsAction } from '@/app/actions';
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
import { Download, Upload, Zap, Sparkles, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import Image from 'next/image';


const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Vintage', 'Urban', 'Futuristic', 'Eco-Natural', 'Sporty', 'Luxury', 'Geometric'];

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Upload your logo and define your brand identity inputs.');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  
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
        setUserId(userCredential.user.uid);
      } catch (authError) {
        const firebaseError = authError as AuthError;
        if (firebaseError.code === 'auth/operation-not-allowed' || firebaseError.code === 'auth/configuration-not-found') {
          console.warn(
            "Firebase Anonymous Authentication is not enabled. Using a fallback temporary user ID. To persist user data, please enable Anonymous Sign-In in your Firebase project's Authentication settings."
          );
        } else {
          console.error('Firebase authentication failed:', firebaseError);
        }
        setUserId(crypto.randomUUID()); // Fallback for local dev or if auth is not enabled
      }
    };
    signIn();
  }, []);

  const onSubmit = async (values: z.infer<typeof brandFormSchema>) => {
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    setStatusMessage('Generating cohesive brand identity mockups...');

    try {
      const result = await generateIdentityAction(values);

      if (result.error) {
        throw new Error(result.error);
      }
      
      setGeneratedImageUrl(result.imageUrl as string);
      setStatusMessage('Brand identity successfully generated! Review and download your high-resolution mockups.');

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(`Failed to generate image. Error: ${errorMessage}. Please check your inputs or try again.`);
      setStatusMessage('Generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const onImprove = async () => {
    if (!generatedImageUrl) return;
    setIsImproving(true);
    setError(null);
    
    try {
      const values = form.getValues();
      const result = await suggestImprovementsAction({
        brandName: values.brandName ?? 'brand',
        mainColor: values.mainColor,
        style: values.style,
        merchandise: values.merchandise,
        generatedImageUrl: generatedImageUrl,
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
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `${(form.getValues('brandName') || 'brand').toLowerCase().replace(/\s/g, '_')}_mockups_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [generatedImageUrl, form]);
  
  const isGenerateDisabled = isLoading || !logoFile;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 font-body text-foreground">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-foreground flex items-center justify-center space-x-3">
          <Zap className="h-8 w-8 text-primary" />
          <span>Structured Brand Identity Generator</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Define your brand elements and let AI generate a single, high-quality, multi-item mockup image.
        </p>
        {userId && (
          <p className="mt-1 text-xs text-muted-foreground/80">
            User ID: {userId.substring(0, 8)}...
          </p>
        )}
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <Card className="lg:col-span-1 h-fit">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
              <h2 className="text-2xl font-bold text-card-foreground">1. Brand Definition</h2>
              
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand / Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hello AI" {...field} />
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
                    <FormLabel>Upload Logo Image *</FormLabel>
                    <FormControl>
                      <div 
                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/80 transition"
                        onClick={() => fileInputRef.current?.click()}
                      >
                         <div className="space-y-1 text-center">
                            {logoPreviewUrl ? (
                              <div className='relative w-40 h-40 mx-auto'>
                                <Image src={logoPreviewUrl} alt="Logo Preview" layout="fill" objectFit="contain" />
                              </div>
                            ) : (
                              <>
                                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <div className="flex text-sm text-muted-foreground">
                                    <span className="font-medium text-primary hover:text-primary/80">
                                      Click to upload logo
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground/70">PNG/JPG up to 5MB</p>
                              </>
                            )}
                            <input 
                              ref={fileInputRef} 
                              type="file" 
                              className="sr-only" 
                              accept="image/png, image/jpeg, image/jpg"
                              onChange={(e) => onChange(e.target.files?.[0])}
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
                    <FormLabel>Merchandise Items (Comma Separated) *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., packaging bag, hat, lanyard" {...field} />
                    </FormControl>
                    <p className="mt-1 text-xs text-muted-foreground/70">List 3-5 items for the best result.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Color Theme *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Violet, #FF0000" {...field} />
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
                    <FormLabel>Design Style *</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a design style" />
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

              <Button type="submit" disabled={isGenerateDisabled} className="w-full !mt-8 text-lg py-6 transition-transform transform hover:scale-[1.02] active:scale-[0.98]">
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                <span>{isLoading ? 'Generating...' : 'Generate Mockups'}</span>
              </Button>
            </form>
          </Form>
        </Card>

        <Card className="lg:col-span-2 p-6 sm:p-8 flex flex-col">
           <div className="flex items-center space-x-2 mb-4">
              <Zap className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-card-foreground">2. Generated Mockup</h2>
           </div>
          
            <div className="min-h-12 mb-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!error && statusMessage && (
                    <div className={`px-4 py-3 rounded-lg text-sm ${isLoading ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-primary/10 text-primary/80 dark:text-primary'}`}>
                        <p>{statusMessage}</p>
                    </div>
                )}
            </div>

            <div className="relative border-4 border-dashed border-muted rounded-2xl overflow-hidden flex-grow min-h-[500px] flex items-center justify-center bg-background/50 p-4">
              {generatedImageUrl && !isLoading && (
                  <>
                      <img
                          src={generatedImageUrl}
                          alt="Generated Brand Identity Mockup"
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      />
                      <div className="absolute bottom-4 right-4 flex space-x-2">
                          <Button onClick={onImprove} disabled={isImproving} className="shadow-lg transition-transform transform hover:scale-105 active:scale-95">
                              {isImproving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                              <span>Improve</span>
                          </Button>
                          <Button onClick={downloadImage} className="shadow-lg transition-transform transform hover:scale-105 active:scale-95">
                              <Download className="mr-2 h-5 w-5" />
                              <span>Download</span>
                          </Button>
                      </div>
                  </>
              )}
              {!generatedImageUrl && !isLoading && (
                  <div className="text-center text-muted-foreground p-10">
                      <Sparkles className="mx-auto h-16 w-16 text-primary/10 mb-4" />
                      <p className="text-lg font-semibold">
                          Your masterpiece will appear here.
                      </p>
                       <p className="text-sm">Fill in the form and click &lsquo;Generate Mockups&rsquo;.</p>
                  </div>
              )}
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
            </div>
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
