import type { Metadata } from "next";
import Image from "next/image";
import { AgeGate } from "@/components/AgeGate";

export const metadata: Metadata = {
  title: "Narcissus AI — Adults only",
  description:
    "Confirm you are 18+ to enter Narcissus — Your Reflection, Your Rules.",
};

/**
 * Age gate only. Marketing / house / outlet content lives on /menu after agree.
 */
export default function HomePage() {
  return (
    <div className="home-root relative min-h-screen">
      <section className="home-hero relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
        <div className="home-hero-atmosphere" aria-hidden="true">
          <div className="home-hero-art">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="select-none"
            />
          </div>
          <div className="home-hero-glow" />
          <div className="home-hero-wash" />
          <div className="home-hero-grain" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <div className="home-brand-block home-fade-up">
            <span className="home-brand-mark relative mb-6 inline-flex h-20 w-20 overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/25 sm:h-24 sm:w-24">
              <Image
                src="/brand/narcissus-logo.jpg"
                alt="Narcissus AI"
                width={96}
                height={96}
                priority
                className="h-full w-full object-cover object-[center_28%]"
              />
            </span>
            <h1
              className="text-[clamp(2.5rem,10vw,4.5rem)] font-semibold leading-[0.95] tracking-tight text-[var(--accent-strong)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Narcissus
            </h1>
          </div>

          <p
            className="home-fade-up home-fade-up-delay-1 mt-4 text-lg font-light text-[var(--ink)] sm:text-xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Reflection, Your Rules
          </p>

          <div className="home-fade-up home-fade-up-delay-2 mt-10 flex w-full justify-center">
            <AgeGate />
          </div>
        </div>
      </section>
    </div>
  );
}
