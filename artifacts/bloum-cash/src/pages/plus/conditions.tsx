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

export default function Conditions() {
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
        <h1 className="text-lg font-bold flex-1">Conditions d'utilisation</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 leading-tight mb-2">
            Conditions Générales<br />d'Utilisation
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">Dernière mise à jour : Juin 2026</p>

          <Section title="1. Introduction">
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile <strong>Bloum Cash</strong>, éditée par <strong>Ashtech Sarl</strong>, société enregistrée en République Togolaise.
            </p>
            <p>
              En téléchargeant, en vous inscrivant ou en utilisant Bloum Cash, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, veuillez cesser immédiatement d'utiliser l'application.
            </p>
          </Section>

          <Section title="2. Description du service">
            <p>Bloum Cash est une application de paiement mobile permettant :</p>
            <ul>
              <li>D'effectuer des transferts d'argent entre les réseaux <strong>TMoney</strong> et <strong>Moov Money</strong> au Togo ;</li>
              <li>De recevoir des paiements via un code QR personnel ;</li>
              <li>De consulter l'historique de vos transactions en temps réel ;</li>
              <li>D'accéder à des services financiers complémentaires proposés par Ashtech Sarl.</li>
            </ul>
            <p>
              Le service est disponible 24h/24, 7j/7, sous réserve de maintenance ou d'indisponibilité temporaire des réseaux des opérateurs partenaires.
            </p>
          </Section>

          <Section title="3. Conditions d'accès">
            <p>Pour utiliser Bloum Cash, vous devez :</p>
            <ul>
              <li>Être âgé d'au moins <strong>18 ans</strong> ;</li>
              <li>Résider en République Togolaise ;</li>
              <li>Disposer d'un numéro de téléphone mobile actif au Togo ;</li>
              <li>Posséder un compte TMoney et/ou Moov Money actif et suffisamment approvisionné ;</li>
              <li>Disposer d'une connexion internet fonctionnelle.</li>
            </ul>
          </Section>

          <Section title="4. Compte utilisateur">
            <p>
              Lors de votre inscription, vous devez fournir des informations exactes, complètes et à jour. Vous êtes entièrement responsable de la confidentialité de vos identifiants (numéro de téléphone et code PIN).
            </p>
            <p>
              Toute activité effectuée depuis votre compte est réputée être de votre fait. En cas de compromission de vos accès, vous devez nous notifier immédiatement via le support disponible dans l'application.
            </p>
            <p>
              Ashtech Sarl se réserve le droit de suspendre ou de supprimer tout compte en cas d'utilisation frauduleuse, abusive ou contraire aux présentes CGU, sans préavis ni indemnité.
            </p>
          </Section>

          <Section title="5. Transactions et frais">
            <p>
              Les transactions sont <strong>irrévocables</strong> une fois confirmées. Vérifiez soigneusement le numéro de téléphone du destinataire avant de valider tout transfert.
            </p>
            <p>Les frais de service applicables sont :</p>
            <ul>
              <li><strong>Transfert même réseau</strong> (TMoney → TMoney ou Moov → Moov) : <strong>1 %</strong> du montant ;</li>
              <li><strong>Transfert inter-réseaux</strong> (TMoney → Moov ou Moov → TMoney) : <strong>2 %</strong> du montant.</li>
            </ul>
            <p>
              Ces frais sont affichés avant chaque validation. Ashtech Sarl se réserve le droit de modifier ses tarifs, avec notification préalable aux utilisateurs.
            </p>
          </Section>

          <Section title="6. Obligations de l'utilisateur">
            <p>En utilisant Bloum Cash, vous vous engagez à :</p>
            <ul>
              <li>Utiliser l'application uniquement à des fins légales et licites ;</li>
              <li>Ne pas tenter de contourner les systèmes de sécurité de l'application ;</li>
              <li>Ne pas utiliser le service à des fins de blanchiment d'argent ou de financement d'activités illégales ;</li>
              <li>Ne pas partager vos identifiants de connexion avec des tiers ;</li>
              <li>Signaler immédiatement toute opération suspecte ou anomalie constatée.</li>
            </ul>
          </Section>

          <Section title="7. Limitation de responsabilité">
            <p>Ashtech Sarl ne pourra être tenu responsable des pertes résultant :</p>
            <ul>
              <li>D'une utilisation frauduleuse de votre compte due à votre négligence ;</li>
              <li>D'erreurs de saisie lors d'un transfert (mauvais numéro, mauvais montant) ;</li>
              <li>D'une indisponibilité des réseaux TMoney ou Moov Money ;</li>
              <li>De cas de force majeure (pannes réseau, catastrophes naturelles, décisions gouvernementales).</li>
            </ul>
            <p>
              La responsabilité d'Ashtech Sarl est en tout état de cause limitée au montant de la transaction litigieuse.
            </p>
          </Section>

          <Section title="8. Propriété intellectuelle">
            <p>
              L'application Bloum Cash, son logo, ses interfaces graphiques, ses textes et l'ensemble de ses contenus sont la propriété exclusive d'Ashtech Sarl et sont protégés par les lois en vigueur en matière de propriété intellectuelle.
            </p>
            <p>
              Toute reproduction, distribution ou utilisation commerciale sans autorisation écrite préalable est strictement interdite.
            </p>
          </Section>

          <Section title="9. Modification des conditions">
            <p>
              Ashtech Sarl se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications importantes par notification dans l'application ou par e-mail.
            </p>
            <p>
              La poursuite de l'utilisation de l'application après notification vaut acceptation des nouvelles conditions.
            </p>
          </Section>

          <Section title="10. Résiliation">
            <p>
              Vous pouvez demander la suppression de votre compte à tout moment depuis la section Paramètres de l'application ou en contactant le support. Ashtech Sarl peut résilier votre accès en cas de violation des présentes CGU.
            </p>
          </Section>

          <Section title="11. Droit applicable et juridiction">
            <p>
              Les présentes CGU sont régies par le droit de la République Togolaise. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, tout litige sera soumis à la compétence exclusive des tribunaux de <strong>Lomé, Togo</strong>.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>Pour toute question relative aux présentes CGU :</p>
            <ul>
              <li><strong>Société :</strong> Ashtech Sarl</li>
              <li><strong>Application :</strong> Bloum Cash</li>
              <li><strong>Support :</strong> Menu → Aide dans l'application</li>
              <li><strong>WhatsApp :</strong> Menu → Support WhatsApp</li>
            </ul>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </div>
  );
}
