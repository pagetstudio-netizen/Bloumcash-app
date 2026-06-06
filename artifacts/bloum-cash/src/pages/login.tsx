import React from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide" }),
  pin: z.string().length(6, { message: "Le code PIN doit contenir 6 chiffres" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      pin: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      // In a real app, we'd use the mutation
      // await loginMutation.mutateAsync({ data: values });
      
      // Mock successful login
      setTimeout(() => {
        login({ id: "1", fullName: "Komi Afolabi", email: values.email }, "mock-jwt-token");
        setLocation("/");
      }, 800);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Vérifiez vos identifiants et réessayez.",
      });
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      <div className="h-48 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col items-center justify-center p-6 text-white rounded-b-[2rem]">
        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg mb-4">
          <div className="w-8 h-8 bg-primary rounded-full" />
        </div>
        <h1 className="text-2xl font-bold">Connexion</h1>
      </div>

      <div className="flex-1 p-6 -mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-xl p-6 border border-border"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="nom@exemple.com" type="email" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Code PIN</FormLabel>
                      <Link href="/forgot-pin" className="text-sm text-primary font-medium">
                        Oublié ?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} className="w-12 h-14 text-lg border-2" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary font-semibold">
                S'inscrire
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
