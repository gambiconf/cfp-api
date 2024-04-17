export type BodySchema = {
  speakerName: string;
  twitterHandler?: string;
  type: 'talk' | 'workshop';
  language: 'only_portuguese' | 'only_english' | 'portuguese_or_english';
  title: string;
  description: string;
  duration?: 0 | 15 | 20 | 30 | 45;
  speakerBio: string;
  speakerSocialMedias: string;
  speakerEmail: string;
  notes?: string;
};

export type Submission = BodySchema & { id: string };
