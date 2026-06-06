import React from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useForgotPin } from "@workspace/api-client-react";
import { useModal } from "@/components/app-modal";

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
import { ArrowLeft } from "lucide-react";

const forgotPinSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide" }),
});

export default function ForgotPin() {
  const [, setLocation] = useLocation();
  const { showModal } = useModal();
  const forgotPinMutation = useForgotPin();

  const form = useForm<z.infer<typeof forgotPinSchema>>({
    resolver: zodResolver(forgotPinSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPinSchema>) {
    try {
      // In a real app:
      // await forgotPinMutation.mutateAsync({ data: values });
      
      setTimeout(() => {
        showModal({
          type: "success",
          title: "Email envoyé",
          message: "Si cette adresse existe, un lien de réinitialisation a été envoyé.",
          onClose: () => setLocation("/login"),
        });
      }, 1000);
    } catch (error) {
      showModal({
        type: "error",
        title: "Erreur",
        message: "Une erreur est survenue. Veuillez réessayer.",
      });
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      <div className="h-40 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col p-6 text-white rounded-b-[2rem] pt-12">
        <Link href="/login" className="flex items-center text-white mb-4">
          <ArrowLeft className="w-6 h-6 mr-2" /> Retour
        </Link>
        <h1 className="text-2xl font-bold">Code PIN oublié ?</h1>
        <p className="text-white/80 mt-1">Entrez votre e-mail pour le réinitialiser</p>
      </div>

      <div className="flex-1 p-6 -mt-8 pb-12">
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

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
}
