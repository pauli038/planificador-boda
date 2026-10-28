import type { Metadata } from "next";
import RsvpForm from "@/components/RsvpForm";
import { findInvitation } from "@/lib/rsvp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const found = await findInvitation((await params).codigo).catch(() => null);
  const names = found?.invitation.boda.nombres;
  return {
    title: names ? `Boda de ${names}` : "Confirma tu asistencia",
    description: "Confirma tu asistencia a la boda",
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const found = await findInvitation(codigo).catch(() => null);
  return (
    <main className="wrap rsvp-page">
      {found ? (
        <RsvpForm code={codigo} initial={found.invitation} />
      ) : (
        <section className="invite">
          <p className="invite-kicker">Invitación</p>
          <h1>Este link no funciona</h1>
          <p className="invite-text">Puede que esté incompleto o que la invitación haya cambiado. Pide a los novios que te lo vuelvan a enviar.</p>
        </section>
      )}
    </main>
  );
}
