export const DISCLAIMER_VERSION = '2026-01';

export const DISCLAIMER_TITLE = 'Member Disclaimer & Limitation of Liability';

export const DISCLAIMER_DRAFT_NOTE =
  'DRAFT — For internal review only. This content has not been reviewed by a licensed attorney '
  + 'and should not be published live or relied upon until qualified legal counsel in your operating '
  + 'jurisdiction(s) has reviewed and approved it, particularly the limitation-of-liability, '
  + 'indemnification, and arbitration/governing-law provisions.';

export const DISCLAIMER_INTRO =
  'This Member Disclaimer & Limitation of Liability ("Disclaimer") is incorporated into, and forms '
  + 'part of, the Project Connect Terms of Use. It applies to every person who registers for or uses '
  + 'Project Connect (the "Platform"), including free members, paid subscribers, Chapter Leads, and '
  + 'Recruiter Subscription users (collectively, "members," "you"). By creating an account or using '
  + 'the Platform, you acknowledge that you have read, understood, and agree to this Disclaimer.';

export type DisclaimerSection = {
  title: string;
  paras?: string[];
  bullets?: string[];
  tail?: string[];
};

export const DISCLAIMER_SECTIONS: DisclaimerSection[] = [
  {
    title: '1. Nature of the Platform',
    paras: [
      'Project Connect ("we," "us," "our") operates a technology platform that facilitates profile-based networking, an activity feed, and algorithmically matched in-person meetups among professionals, together with related features such as Director Series content, Chapter Lead programs, Transformation Mapping, and Recruiter Subscription access. Project Connect is a facilitator that connects members to one another and, where applicable, to venues and recruiters. We do not employ, supervise, direct, or control our members, Chapter Leads, venue partners, event attendees, or any other individual or organization who participates in Platform-facilitated activities, and no such person or organization is our agent, joint venturer, partner, or representative.',
    ],
  },
  {
    title: '2. No Verification of Members or Their Information',
    paras: [
      'Project Connect does not conduct criminal background checks, identity verification, employment verification, professional-credential verification, or reference checks on any member, Chapter Lead, or other user, except where a specific feature expressly states otherwise in writing. All profile information — including a member\u2019s name, photo, job title, employer, industry, certifications, location, and biographical details — is self-reported by the member who submits it and is not independently verified by Project Connect.',
    ],
  },
  {
    title: '3. Members Are Responsible for the Accuracy of Their Information',
    paras: [
      'Each member is solely responsible for ensuring that all information they submit to the Platform — at registration, in their profile, in the feed, in event RSVPs, or in any communication through the Platform — is accurate, current, complete, and not misleading. Without limiting the foregoing, each member represents and warrants that they:',
    ],
    bullets: [
      'will not impersonate any person or entity, or falsely state or otherwise misrepresent their identity, age, employer, job title, professional certifications, or affiliation with any person or organization;',
      'will not create or maintain more than one account, or create an account on behalf of another person without authorization;',
      'will promptly correct or update their profile if information they provided becomes inaccurate or outdated; and',
      'understand that other members, Chapter Leads, café partners, and recruiters may rely on the accuracy of the information a member provides.',
    ],
    tail: [
      'Project Connect reserves the right, but has no obligation, to request supporting documentation for any information provided, and to suspend, restrict, or terminate — without prior notice and without liability — any account it reasonably believes contains false, misleading, or unauthorized information.',
    ],
  },
  {
    title: '4. No Responsibility for Member Conduct',
    paras: [
      'Project Connect does not control, and is not responsible for, the conduct of members, Chapter Leads, venue staff, or any other third party, whether that conduct occurs on the Platform, at a meetup or event, or in any communication or interaction arising from use of the Platform. To the fullest extent permitted by applicable law, Project Connect disclaims all responsibility and liability for:',
    ],
    bullets: [
      'any statement, representation, conduct, act, or omission of any member, Chapter Lead, venue partner, recruiter, or other third party;',
      'any harassment, discrimination, fraud, theft, violence, defamation, threatening behavior, or other misconduct by a member or third party, whether directed at another member or otherwise;',
      'any dispute, financial transaction, business dealing, employment decision, or professional or personal relationship that arises between members or between a member and a recruiter or third party; and',
      'any harm, loss, injury, or damage resulting from a member\u2019s misrepresentation of their identity, qualifications, employer, or intentions.',
    ],
    tail: [
      'Project Connect is not responsible for screening members before, during, or after any interaction, and makes no representation or guarantee about the character, intentions, background, or suitability of any member.',
    ],
  },
  {
    title: '5. In-Person Meetups — Assumption of Risk',
    paras: [
      'Meetups facilitated through the Platform take place in person, typically at cafés or other third-party venues that Project Connect does not own, operate, or staff. Attendance at any meetup, event, or in-person gathering arranged through the Platform is entirely voluntary and at each member\u2019s own risk. Each member is responsible for exercising their own judgment and discretion regarding their personal safety and well-being, including when meeting other members in person for the first time. Project Connect strongly recommends that members meet in public places, tell a friend or family member their meetup plans, and otherwise follow generally accepted personal-safety practices when meeting new people. To the fullest extent permitted by applicable law, Project Connect is not liable for any injury, loss, or damage arising from a member\u2019s attendance at, or travel to or from, any meetup or event.',
    ],
  },
  {
    title: '6. Third-Party Venues, Café Partners, and Recruiters',
    paras: [
      'Café partners, venues, recruiters, and any other third-party businesses referenced, promoted, or given access through the Platform are independent third parties and are not employees, agents, or representatives of Project Connect. Project Connect is not responsible for the quality, safety, cleanliness, accessibility, pricing, availability, or conduct of any venue, its staff, or its offers, discounts, or promotions, nor for the conduct or hiring decisions of any recruiter granted access to Transformation Mapping or member profiles.',
    ],
  },
  {
    title: '7. Chapter Leads',
    paras: [
      'Chapter Leads are members recognized by Project Connect to help organize and host local meetups. Chapter Leads are not employees, agents, or legal representatives of Project Connect. Their statements, decisions, and actions — including decisions about who may attend a meetup or how a meetup is run — are their own, and Project Connect is not responsible for any act or omission of a Chapter Lead, except where required by applicable law.',
    ],
  },
  {
    title: '8. Reporting Concerns; No Guaranteed Response',
    paras: [
      'Members may report a concern about another member\u2019s conduct, or about the accuracy of information on the Platform, to [report@projectconnect.example]. Project Connect may, in its sole discretion, investigate reports, request additional information, warn, suspend, or remove any member or content. However, Project Connect is under no obligation to investigate any report, and does not guarantee any specific outcome, timeline, or response, nor that it will inform the reporting member of any action taken.',
    ],
  },
  {
    title: '9. Indemnification',
    paras: [
      'Each member agrees to indemnify, defend, and hold harmless Project Connect and its founders, officers, employees, contractors, Chapter Leads, and affiliates (the "Project Connect Parties") from and against any and all claims, demands, damages, losses, liabilities, and expenses (including reasonable legal fees) arising out of or relating to: (a) the member\u2019s breach of this Disclaimer or the Terms of Use; (b) inaccurate, false, or misleading information the member provided; (c) the member\u2019s conduct toward, or interaction with, any other member, Chapter Lead, venue, recruiter, or third party; or (d) the member\u2019s attendance at, or participation in, any meetup or Platform-facilitated event.',
    ],
  },
  {
    title: '10. Limitation of Liability',
    paras: [
      'To the fullest extent permitted by applicable law, in no event shall the Project Connect Parties be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of profits, revenue, data, goodwill, or other intangible losses, arising out of or relating to (a) any member\u2019s conduct or misrepresentation; (b) any interaction, meetup, introduction, or relationship formed through or facilitated by the Platform; or (c) any third-party venue, Chapter Lead, or recruiter. Subject to applicable law, the Project Connect Parties\u2019 total aggregate liability for any and all claims arising out of or relating to a member\u2019s use of the Platform shall not exceed the greater of (i) the total amount the member paid to Project Connect in the twelve (12) months immediately preceding the event giving rise to the claim, or (ii) [CAD $100].',
    ],
  },
  {
    title: '11. No Warranty',
    paras: [
      'The Platform, and any matching, introduction, recommendation, or content (including Director Series content) provided through it, are provided "as is" and "as available," without warranties of any kind, whether express, implied, or statutory, including without limitation any warranty that a member is who they represent themselves to be, that a match, introduction, or meetup will be suitable, safe, or successful, or that the Platform will be uninterrupted, secure, or error-free.',
    ],
  },
  {
    title: '12. Relationship to the Terms of Use',
    paras: [
      'This Disclaimer supplements, and is incorporated into, the Project Connect Terms of Use and Privacy Policy. If there is any conflict between this Disclaimer and another Project Connect policy, the provision that is more protective of Project Connect\u2019s position, or more specific to the subject matter of the conflict, will control, to the extent permitted by applicable law.',
    ],
  },
  {
    title: '13. Governing Law',
    paras: [
      'This Disclaimer is governed by, and will be construed in accordance with, the laws of [Province/State, Country], without regard to its conflict-of-laws principles, and subject to any arbitration or dispute-resolution provisions set out in the Terms of Use.',
    ],
  },
  {
    title: '14. Contact',
    paras: [
      'Questions about this Disclaimer can be directed to [legal@projectconnect.example].',
    ],
  },
];
