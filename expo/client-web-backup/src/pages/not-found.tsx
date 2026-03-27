import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTION_TITLE_CLASS, CAPTION_CLASS } from "@/lib/design-tokens";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 py-10">
        <div className="glass-card sc-noise overflow-hidden rounded-3xl border border-white/5 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--ring))]" />
            </div>
            <div>
              <div className={SECTION_TITLE_CLASS} data-testid="text-404-title">
                Page not found
              </div>
              <p
                className={"mt-1 " + CAPTION_CLASS}
                data-testid="text-404-body"
              >
                That route doesn’t exist in this prototype.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button asChild data-testid="button-404-home" className="rounded-full">
              <Link href="/home">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              data-testid="button-404-onboarding"
              className="rounded-full bg-transparent"
            >
              <Link href="/">Onboarding</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
