import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-white flex flex-col md:max-w-md md:mx-auto overflow-hidden";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <div className="text-[15px] text-gray-700 leading-relaxed space-y-2 [&_ul]:mt-2 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function Confidentialite() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Politique de confidentialité</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 leading-tight mb-2">
            Politique de<br />Confidentialité
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">Dernière mise à jour : Juin 2026</p>

          <Section title="1. Introduction">
            <p>
              La présente Politique de Confidentialité explique comment <strong>Bloum Cash</strong>, éditée par <strong>Ashtech Sarl</strong> (ci-après « nous » ou « notre »), collecte, utilise, partage et protège les informations personnelles de ses utilisateurs (ci-après « Utilisateur » ou « vous »).
            </p>
            <p>
              Nous nous engageons à respecter la confidentialité et la sécurité de vos données personnelles conformément aux lois et réglementations en vigueur en République Togolaise.
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p>Dans le cadre de l'utilisation de nos services, nous pouvons collecter les types de données suivants :</p>
            <ul>
              <li><strong>Données d'identité :</strong> Nom complet, date de naissance.</li>
              <li><strong>Données de contact :</strong> Numéro de téléphone mobile, adresse e-mail.</li>
              <li><strong>Données financières :</strong> Numéros de comptes TMoney et/ou Moov Money associés, historique des transactions, montants transférés.</li>
              <li><strong>Données d'utilisation :</strong> Historique de navigation dans l'application, fréquence d'utilisation, données de connexion.</li>
              <li><strong>Données techniques :</strong> Type d'appareil, système d'exploitation, identifiant unique de l'appareil, adresse IP.</li>
            </ul>
          </Section>

          <Section title="3. Utilisation des données">
            <p>Vos données personnelles sont utilisées exclusivement pour :</p>
            <ul>
              <li>Fournir et gérer les services de transfert d'argent et de paiement QR ;</li>
              <li>Vérifier votre identité et prévenir la fraude ;</li>
              <li>Traiter vos transactions de manière sécurisée ;</li>
              <li>Vous envoyer des notifications relatives à votre compte et vos opérations ;</li>
              <li>Améliorer la qualité et les fonctionnalités de l'application ;</li>
              <li>Respecter nos obligations légales et réglementaires.</li>
            </ul>
          </Section>

          <Section title="4. Partage des données">
            <p>
              Vos données personnelles ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent être partagées dans les cas suivants :
            </p>
            <ul>
              <li><strong>Opérateurs partenaires :</strong> TMoney et Moov Money, uniquement pour traiter vos transactions ;</li>
              <li><strong>Obligations légales :</strong> Lorsque la loi togolaise l'exige (autorités fiscales, judiciaires ou réglementaires) ;</li>
              <li><strong>Prestataires techniques :</strong> Hébergement sécurisé et maintenance de l'infrastructure, sous contrat de confidentialité strict.</li>
            </ul>
          </Section>

          <Section title="5. Sécurité des données">
            <p>
              Nous mettons en œuvre des mesures de sécurité de niveau bancaire pour protéger vos données :
            </p>
            <ul>
              <li>Chiffrement de toutes les communications via <strong>TLS 1.3</strong> ;</li>
              <li>Hachage sécurisé de vos mots de passe (vos codes PIN ne sont jamais stockés en clair) ;</li>
              <li>Authentification forte à chaque connexion ;</li>
              <li>Surveillance continue des accès et détection d'anomalies ;</li>
              <li>Accès aux données limité au personnel strictement autorisé.</li>
            </ul>
          </Section>

          <Section title="6. Conservation des données">
            <p>
              Vos données personnelles sont conservées pendant la durée nécessaire à la fourniture du service et conformément aux obligations légales togolaises :
            </p>
            <ul>
              <li><strong>Données de transaction :</strong> 5 ans à compter de la date de l'opération ;</li>
              <li><strong>Données de compte :</strong> Durée de vie du compte + 2 ans après sa fermeture ;</li>
              <li><strong>Données de connexion :</strong> 12 mois.</li>
            </ul>
          </Section>

          <Section title="7. Vos droits">
            <p>Conformément à la réglementation en vigueur, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles ;</li>
              <li><strong>Droit de rectification :</strong> Corriger des informations inexactes ou incomplètes ;</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données dans les limites légales ;</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré ;</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données pour des raisons légitimes.</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous via le support disponible dans l'application.
            </p>
          </Section>

          <Section title="8. Cookies et technologies similaires">
            <p>
              L'application utilise uniquement des cookies et technologies techniques <strong>essentiels au fonctionnement</strong> du service (maintien de la session, sécurité). Aucun cookie publicitaire, aucun cookie de suivi tiers ni aucune technologie de profilage n'est utilisé.
            </p>
          </Section>

          <Section title="9. Transfert de données hors du Togo">
            <p>
              Dans le cadre de l'hébergement de vos données, certaines informations peuvent être traitées sur des serveurs situés hors de la République Togolaise. Dans ce cas, nous garantissons un niveau de protection équivalent aux standards togolais par des mesures contractuelles appropriées.
            </p>
          </Section>

          <Section title="10. Mineurs">
            <p>
              Bloum Cash est réservé aux personnes âgées de <strong>18 ans et plus</strong>. Nous ne collectons pas sciemment de données personnelles concernant des mineurs. Si vous êtes le parent ou tuteur d'un mineur ayant accédé à notre service, contactez-nous immédiatement.
            </p>
          </Section>

          <Section title="11. Modification de la politique">
            <p>
              Nous nous réservons le droit de modifier la présente Politique de Confidentialité. Toute modification sera notifiée via l'application avec la date de mise à jour. La poursuite de l'utilisation du service vaut acceptation des modifications.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>Pour toute question relative à la protection de vos données personnelles :</p>
            <ul>
              <li><strong>Responsable :</strong> Ashtech Sarl — Bloum Cash</li>
              <li><strong>Support :</strong> Menu → Aide dans l'application</li>
              <li><strong>WhatsApp :</strong> Menu → Support WhatsApp</li>
              <li><strong>E-mail :</strong> privacy@bloumcash.com</li>
            </ul>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </div>
  );
}
