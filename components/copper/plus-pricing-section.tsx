import { CheckIcon, XIcon } from "lucide-react";
import { PlanFinder } from "@/components/copper/plan-finder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatMemory,
  formatNotesHours,
  formatUsd,
  getPlans,
} from "@/lib/copper/catalog";

export function PlusPricingSection() {
  const plans = getPlans();

  return (
    <section
      id="plus"
      data-testid="plus-pricing"
      className="scroll-mt-16 bg-secondary py-16 text-secondary-foreground md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-balance sm:text-4xl">
            Free to start, more with Copper Plus
          </h2>
          <p className="mt-4 text-lg text-foreground/75">
            Every Copper device works out of the box. Add Copper Plus for a
            longer memory, unlimited Notes and refined answers.
          </p>
        </div>

        <PlanFinder />

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {plans.map((plan) => {
            const featured = plan.id === "copper-plus";
            return (
              <Card
                key={plan.id}
                data-plan={plan.id}
                className={cn(
                  "h-full gap-0 py-0",
                  featured
                    ? "border-2 border-primary shadow-xl ring-0"
                    : "shadow-sm",
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    {featured && <Badge>Most popular</Badge>}
                  </div>

                  <div>
                    <p className="font-heading">
                      <span className="text-4xl font-bold">
                        {formatUsd(plan.monthlyUsd)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      or {formatUsd(plan.annualUsd)}/year
                    </p>
                  </div>

                  <dl className="flex flex-col border-t">
                    <Row label="Memory kept">
                      {formatMemory(plan.memoryDays)}
                    </Row>
                    <Row label="Notes recording">
                      {formatNotesHours(plan.notesHoursPerMonth)}
                    </Row>
                    <Row label="Refined answers">
                      {plan.refinedAnswers ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-full bg-patina text-night">
                            <CheckIcon
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </span>
                          Included
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className="grid size-5 place-items-center rounded-full bg-muted">
                            <XIcon aria-hidden="true" className="size-3.5" />
                          </span>
                          Not included
                        </span>
                      )}
                    </Row>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-4 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}
