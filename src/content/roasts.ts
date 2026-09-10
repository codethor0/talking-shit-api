import type { Category, Level } from "../types";

type Catalog = Readonly<Record<Category, Readonly<Record<Level, readonly string[]>>>>;

export const ROASTS = {
  general: {
    mild: [
      "You bring strong 'works on my machine' energy to problems that do not involve a machine.",
      "Your plan has excellent documentation for something nobody intends to do.",
      "You have the confidence of a green checkmark and the context of an empty README.",
      "That idea shipped with all the urgency of a calendar invite titled 'quick sync.'",
    ],
    spicy: [
      "Your decision-making process is basically undefined behavior with a LinkedIn profile.",
      "You are not blocked. You are load-bearing technical debt with calendar access.",
      "Your roadmap has more fiction than the dependency graph you swear is under control.",
      "You turned a five-minute problem into a cross-functional learning opportunity.",
    ],
    dark: [
      "Your project has entered the hospice phase where everyone calls outages 'learning opportunities.'",
      "Your architecture review has the energy of a coroner's report: everyone knows what died, nobody wants the timestamp.",
      "The good news is your system has achieved immortality. Nobody understands it well enough to kill it.",
      "Your backlog is not a plan. It is a mass grave with Jira permissions.",
    ],
  },
  code: {
    mild: [
      "That function has more responsibilities than the person who approved it.",
      "Your abstraction is doing a fantastic job hiding the part where nothing is actually simpler.",
      "The code is self-documenting in the same way a crime scene is self-documenting.",
      "You named the variable 'data' and somehow made the debugger feel judgmental.",
    ],
    spicy: [
      "Your codebase is what happens when copy-paste earns merge rights.",
      "That helper function has grown into a small government with no term limits.",
      "You did not remove complexity. You put it behind an interface and changed its phone number.",
      "The type system filed a missing-person report three commits ago.",
    ],
    dark: [
      "This code is a digital crime scene and git blame is the autopsy report.",
      "Your function has been dead for six releases. Production keeps moving the body.",
      "This repository does not need refactoring. It needs witnesses and a sealed evidence bag.",
      "Your code review is less about correctness now and more about establishing time of death.",
    ],
  },
  debugging: {
    mild: [
      "The bug is reproducible, which already makes it more dependable than the feature.",
      "Your debugger has seen things no logging framework should have to remember.",
      "You fixed the symptom so cleanly the root cause almost feels respected.",
      "The stack trace is trying harder to communicate than the original ticket.",
    ],
    spicy: [
      "You are three breakpoints away from discovering the bug was the architecture all along.",
      "The logs are not noisy. They are screaming over each other because nobody designed observability.",
      "Your workaround has survived long enough to become an undocumented product requirement.",
      "At this point the debugger is just live-streaming consequences.",
    ],
    dark: [
      "The root cause is buried so deep the stack trace needs next-of-kin notification.",
      "You are not debugging anymore. You are performing digital archaeology at an active disaster site.",
      "The incident ended hours ago. The causal chain is still wandering the building looking for an owner.",
      "Your logs read like final transmissions from services that knew nobody was coming.",
    ],
  },
  deploy: {
    mild: [
      "Bold deployment strategy: change everything and let observability introduce itself.",
      "Your rollback plan appears to be refreshing the dashboard with conviction.",
      "Production noticed your confidence and has begun preparing a lesson.",
      "The deploy passed CI, which is a beautiful way to begin this mystery.",
    ],
    spicy: [
      "You deployed on Friday because apparently weekends are an observability feature.",
      "Your release process is just Russian roulette with semantic versioning.",
      "That deployment had one canary, and somebody already sent flowers.",
      "Your rollback procedure begins with 'remember what we changed,' so this should go well.",
    ],
    dark: [
      "Production did not go down. It achieved a permanent separation from user expectations.",
      "Your deployment strategy has progressed from blue-green to black-armband.",
      "The release window closed. The incident channel is now handling bereavement.",
      "You called it zero-downtime because technically the service stopped having a meaningful concept of time.",
    ],
  },
  meetings: {
    mild: [
      "This meeting could have been an email, and the email could have been silence.",
      "Excellent sync. We are now aligned on scheduling another sync.",
      "The agenda contains three bullets and somehow none of them survived contact with the meeting.",
      "Nothing says velocity like twelve people watching one person share a browser tab.",
    ],
    spicy: [
      "This meeting is distributed denial of service, but for engineering attention spans.",
      "We assembled six senior engineers to discover somebody needed to update a ticket.",
      "The meeting has no owner, no decision, and apparently no natural predator.",
      "We have reached consensus that nobody knows why we are still on this call.",
    ],
    dark: [
      "This meeting died twenty minutes ago, but corporate policy requires the body remain on Zoom until the hour.",
      "The agenda is deceased. We are now preserving its remains in meeting notes nobody will read.",
      "This call has become a hostage situation with screen sharing.",
      "By the time this meeting ends, the original problem will qualify as legacy infrastructure.",
    ],
  },
  security: {
    mild: [
      "Your threat model currently lists 'hopefully nobody notices' as a compensating control.",
      "The security boundary is mostly a strongly worded comment.",
      "Your secret-management strategy has excellent autocomplete support.",
      "That input validation has the structural integrity of a checkbox labeled 'sanitize.'",
    ],
    spicy: [
      "Your attack surface has an attack parking lot and overflow seating.",
      "You did not implement least privilege. You implemented trust with extra steps.",
      "Your security review found no issues because apparently nobody invited the adversary.",
      "That token has lived longer than some production services and has considerably more authority.",
    ],
    dark: [
      "Your threat model is a memorial to assumptions the attacker already buried.",
      "The blast radius is no longer a radius. It has zoning laws.",
      "Your security controls are technically defense in depth if we count denial as a layer.",
      "The incident response plan begins after compromise, which is convenient because so does the architecture.",
    ],
  },
} as const satisfies Catalog;
