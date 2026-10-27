import React from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../contact';
import { RESERVATION_VALIDITY_MINUTES, SERVICE_FEE_XOF } from '../../shared/reservations';
import { LOYALTY_AMOUNT_XOF, LOYALTY_STEP_LITERS, REFERRAL_AMOUNT_XOF } from '../../shared/vouchers';
import { getLang, t } from '../i18n';

export type LegalPage = 'terms' | 'privacy';

interface LegalViewProps {
  page: LegalPage;
  onBack: () => void;
}

// Updated by hand whenever the texts below change.
const UPDATED = { fr: '27 octobre 2026', en: '27 October 2026' };

type Section = { title: string; paragraphs: string[] };

// The texts are long, so each language is written out in full here instead of going through t().
function termsFr(): Section[] {
  return [
    {
      title: 'Qui sommes-nous',
      paragraphs: [
        'Pleino est un service togolais qui permet de trouver une station-service, de voir le carburant disponible et de réserver ses litres à l’avance. Le service est proposé sur le site et sur l’application Android Pleino.',
        `Pour toute question : ${SUPPORT_PHONE_DISPLAY} (appel ou WhatsApp) ou ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      title: 'Votre compte',
      paragraphs: [
        'Pour réserver, vous créez un compte avec votre nom, votre numéro de téléphone togolais et un mot de passe. Un compte par personne. Vous gardez votre mot de passe secret : tout ce qui est fait avec votre compte est réputé fait par vous.',
        'Pleino peut suspendre un compte en cas de fraude, de faux signalements répétés, d’avis injurieux ou d’usage abusif du service.',
      ],
    },
    {
      title: 'Réservations et tickets',
      paragraphs: [
        `Le prix au litre, les frais de service (${SERVICE_FEE_XOF} FCFA par réservation, offerts aux membres Premium) et le total sont affichés avant de confirmer. Une fois la réservation confirmée, vous recevez un ticket avec un code et un QR code.`,
        `Le ticket est valable ${RESERVATION_VALIDITY_MINUTES / 60} heures. Présentez-le au pompiste de la station choisie, qui le valide avant de vous servir. Un ticket ne sert qu’une fois et seulement dans cette station.`,
        'Vous pouvez annuler un ticket tant qu’il n’a pas été servi : les litres sont rendus à la station. Un ticket non utilisé à temps expire tout seul.',
        'Les stocks, les prix et les temps d’attente sont donnés par les stations et par les clients. Nous faisons notre possible pour qu’ils soient justes, mais ils peuvent changer à tout moment.',
      ],
    },
    {
      title: 'Bons d’essence et parrainage',
      paragraphs: [
        `Un bon d’essence retire son montant du prix d’une réservation. Il a une date de fin. Un bon d’une station ne marche que dans cette station ; un bon Pleino marche dans toutes les stations partenaires. Chaque fois que vous atteignez ${LOYALTY_STEP_LITERS} L servis, vous recevez un bon fidélité de ${LOYALTY_AMOUNT_XOF} FCFA.`,
        `Parrainage : quand une personne crée son compte avec votre code et fait servir son premier ticket, vous recevez chacun un bon de ${REFERRAL_AMOUNT_XOF} FCFA. Les faux comptes créés pour gagner des bons sont interdits et leurs bons sont retirés.`,
        'Un bon ne s’échange pas contre de l’argent. S’il sert à un ticket annulé ou expiré, il vous est rendu jusqu’à sa date de fin.',
      ],
    },
    {
      title: 'Avis, signalements et photos',
      paragraphs: [
        'Après avoir été servi, vous pouvez noter la station et la personne qui vous a servi. Restez poli et honnête : les avis injurieux ou mensongers peuvent être cachés par Pleino.',
        'Les signalements (plus de carburant, longue file, prix faux, station fermée) aident tout le monde. Ne signalez que ce que vous avez vu.',
        'Votre photo de profil doit vous montrer vous. Pleino peut retirer une photo qui ne convient pas.',
      ],
    },
    {
      title: 'Responsabilité',
      paragraphs: [
        'Le carburant est vendu et servi par la station, qui reste responsable de sa qualité et de la quantité servie. Pleino met en relation les clients et les stations et garde les litres de votre ticket de côté.',
        'Le service peut être interrompu quelques instants pour maintenance ou en cas de panne. Vos tickets restent visibles sur votre téléphone même sans connexion.',
      ],
    },
    {
      title: 'Changements et droit applicable',
      paragraphs: [
        'Ces conditions peuvent évoluer. La date de mise à jour est indiquée en haut de cette page ; en continuant à utiliser Pleino, vous acceptez la version en vigueur.',
        'Ces conditions sont soumises au droit togolais. En cas de désaccord, contactez-nous d’abord : nous chercherons une solution à l’amiable.',
      ],
    },
  ];
}

function termsEn(): Section[] {
  return [
    {
      title: 'Who we are',
      paragraphs: [
        'Pleino is a Togolese service for finding a fuel station, seeing the fuel available and booking your litres in advance. It is offered on the website and in the Pleino Android app.',
        `Questions: ${SUPPORT_PHONE_DISPLAY} (call or WhatsApp) or ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      title: 'Your account',
      paragraphs: [
        'To book, you create an account with your name, your Togolese phone number and a password. One account per person. Keep your password secret: anything done with your account is deemed done by you.',
        'Pleino may suspend an account for fraud, repeated false reports, abusive reviews or misuse of the service.',
      ],
    },
    {
      title: 'Bookings and tickets',
      paragraphs: [
        `The price per litre, the service fee (${SERVICE_FEE_XOF} FCFA per booking, free for Premium members) and the total are shown before you confirm. Once the booking is confirmed you get a ticket with a code and a QR code.`,
        `The ticket is valid for ${RESERVATION_VALIDITY_MINUTES / 60} hours. Show it to the attendant at the chosen station, who validates it before serving you. A ticket can be used once, and only at that station.`,
        'You can cancel a ticket as long as it has not been served: the litres go back to the station. A ticket not used in time expires on its own.',
        'Stocks, prices and waiting times come from the stations and from customers. We do our best to keep them right, but they can change at any time.',
      ],
    },
    {
      title: 'Fuel vouchers and referrals',
      paragraphs: [
        `A fuel voucher takes its amount off the price of one booking. It has an end date. A station's voucher only works at that station; a Pleino voucher works at every partner station. Each time you reach ${LOYALTY_STEP_LITERS} L served you get a ${LOYALTY_AMOUNT_XOF} FCFA loyalty voucher.`,
        `Referrals: when someone creates their account with your code and gets their first ticket served, you each receive a ${REFERRAL_AMOUNT_XOF} FCFA voucher. Fake accounts made to earn vouchers are forbidden and their vouchers are withdrawn.`,
        'A voucher cannot be exchanged for money. If it was used on a ticket that is cancelled or expires, you get it back until its end date.',
      ],
    },
    {
      title: 'Reviews, reports and photos',
      paragraphs: [
        'Once served, you can rate the station and the person who served you. Stay polite and honest: abusive or false reviews may be hidden by Pleino.',
        'Reports (no fuel, long queue, wrong price, station closed) help everyone. Only report what you have seen.',
        'Your profile photo must show you. Pleino may remove an unsuitable photo.',
      ],
    },
    {
      title: 'Liability',
      paragraphs: [
        'Fuel is sold and served by the station, which remains responsible for its quality and for the quantity served. Pleino connects customers with stations and holds the litres of your ticket.',
        'The service may be briefly interrupted for maintenance or in case of failure. Your tickets stay visible on your phone even without a connection.',
      ],
    },
    {
      title: 'Changes and governing law',
      paragraphs: [
        'These terms may change. The date of the last update is shown at the top of this page; by continuing to use Pleino you accept the version in force.',
        'These terms are governed by Togolese law. In case of disagreement, please contact us first: we will look for an amicable solution.',
      ],
    },
  ];
}

function privacyFr(): Section[] {
  return [
    {
      title: 'Ce que nous gardons',
      paragraphs: [
        'Votre compte : nom, numéro de téléphone, e-mail si vous le donnez, et votre mot de passe sous une forme chiffrée que personne ne peut relire, pas même Pleino.',
        'Ce que vous faites sur Pleino : vos réservations et tickets, les bons d’essence, vos stations favorites, vos avis, vos signalements et votre photo de profil si vous en mettez une.',
        'Votre position sert seulement à trouver la station la plus proche. Elle est calculée sur votre téléphone et n’est pas envoyée à Pleino.',
      ],
    },
    {
      title: 'Pourquoi',
      paragraphs: [
        'Pour vous connecter, garder vos litres de côté, permettre au pompiste de valider votre ticket, vous prévenir (ticket servi, carburant de retour, prix en baisse dans vos favoris) et éviter la fraude.',
        'Nous n’affichons pas de publicité et nous ne vendons pas vos données.',
      ],
    },
    {
      title: 'Qui voit quoi',
      paragraphs: [
        'Le gérant et les pompistes de la station où vous réservez voient votre nom, le carburant, les litres et votre photo s’il y en a une, pour vous servir. Ils ne voient pas votre code en entier.',
        'Vos avis sont lus par le gérant de la station avec votre prénom et l’initiale de votre nom ; seule la note moyenne est publique. Les administrateurs de Pleino peuvent voir les comptes pour aider les clients et lutter contre la fraude ; chacune de leurs actions est enregistrée.',
      ],
    },
    {
      title: 'Où et combien de temps',
      paragraphs: [
        'Les données sont stockées sur les serveurs de notre hébergeur, Render, situés à Francfort (Allemagne), avec une connexion chiffrée.',
        'Nous les gardons tant que votre compte existe. Si vous demandez la suppression de votre compte, il est effacé ; seules les traces de paiement que la loi nous oblige à garder sont conservées.',
      ],
    },
    {
      title: 'Sur votre téléphone',
      paragraphs: [
        'Pleino utilise un seul cookie, pour garder votre connexion. Le téléphone garde aussi votre langue, vos favoris, le thème clair ou sombre et une copie de vos tickets pour les montrer sans connexion. Aucun cookie publicitaire.',
      ],
    },
    {
      title: 'Vos droits',
      paragraphs: [
        'Conformément à la loi togolaise n° 2019-014 relative à la protection des données à caractère personnel, vous pouvez demander à voir, corriger ou supprimer vos données, et vous opposer à leur utilisation.',
        `Écrivez-nous à ${SUPPORT_EMAIL} ou sur WhatsApp au ${SUPPORT_PHONE_DISPLAY}. Nous répondons sous 30 jours. Vous pouvez aussi saisir l’Instance de protection des données à caractère personnel (IPDCP).`,
      ],
    },
  ];
}

function privacyEn(): Section[] {
  return [
    {
      title: 'What we keep',
      paragraphs: [
        'Your account: name, phone number, email if you give one, and your password in a scrambled form that nobody can read back, not even Pleino.',
        'What you do on Pleino: your bookings and tickets, fuel vouchers, favourite stations, reviews, reports and your profile photo if you add one.',
        'Your location is only used to find the nearest station. It is worked out on your phone and is not sent to Pleino.',
      ],
    },
    {
      title: 'Why',
      paragraphs: [
        'To sign you in, hold your litres, let the attendant validate your ticket, alert you (ticket served, fuel back, price drop at your favourites) and prevent fraud.',
        'We show no advertising and we do not sell your data.',
      ],
    },
    {
      title: 'Who sees what',
      paragraphs: [
        'The manager and attendants of the station where you book see your name, the fuel, the litres and your photo if you have one, in order to serve you. They do not see your full code.',
        'Your reviews are read by the station manager with your first name and last initial; only the average mark is public. Pleino administrators can see accounts to help customers and fight fraud; every action they take is logged.',
      ],
    },
    {
      title: 'Where and for how long',
      paragraphs: [
        'Data is stored on the servers of our host, Render, in Frankfurt (Germany), over an encrypted connection.',
        'We keep it as long as your account exists. If you ask for your account to be deleted, it is erased; only payment records the law requires us to keep are retained.',
      ],
    },
    {
      title: 'On your phone',
      paragraphs: [
        'Pleino uses a single cookie, to keep you signed in. The phone also keeps your language, favourites, light or dark theme and a copy of your tickets so they show without a connection. No advertising cookies.',
      ],
    },
    {
      title: 'Your rights',
      paragraphs: [
        'Under Togolese law no. 2019-014 on the protection of personal data, you can ask to see, correct or delete your data, and object to its use.',
        `Write to ${SUPPORT_EMAIL} or on WhatsApp at ${SUPPORT_PHONE_DISPLAY}. We answer within 30 days. You can also contact the personal data protection authority (IPDCP).`,
      ],
    },
  ];
}

// Terms of use and privacy policy: required by the Play Store and by law once accounts are kept.
export const LegalView: React.FC<LegalViewProps> = ({ page, onBack }) => {
  const en = getLang() === 'en';
  const sections = page === 'terms' ? (en ? termsEn() : termsFr()) : en ? privacyEn() : privacyFr();
  const title = page === 'terms' ? t('Conditions d’utilisation') : t('Politique de confidentialité');
  const Icon = page === 'terms' ? FileText : ShieldCheck;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-12 space-y-6 text-white">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-700 bg-black/80 text-neutral-300 hover:text-white hover:border-amber-400 text-xs font-bold rounded-xl"
      >
        <ArrowLeft className="w-4 h-4 text-amber-400" /> {t('Retour')}
      </button>
      <article className="bg-black/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Icon className="w-7 h-7 text-active shrink-0" /> {title}
          </h1>
          <p className="text-xs text-neutral-400">{t('Mise à jour : {date}', { date: en ? UPDATED.en : UPDATED.fr })}</p>
        </header>
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-bold">{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p} className="text-sm text-neutral-300 leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
};
