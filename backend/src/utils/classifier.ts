import type { ClassifiedJob, JobCategory, JobRole, NormalizedJob } from '../types/job';

const nonTechnicalPatterns = [
  /marketing/,
  /sales/,
  /recruiter/,
  /talent acquisition/,
  /human resources/,
  /hr\b/,
  /content/,
  /copywriter/,
  /design/,
  /graphic/,
  /product marketing/,
  /social media/,
  /support(?!\s*engineer)/,
  /customer success/,
  /customer support/,
  /operations manager/,
  /office manager/,
  /administrative/,
  /admin\b/
];

const roleMatchers: Array<{
  role: JobRole;
  category: JobCategory;
  titlePatterns: RegExp[];
  tagPatterns: RegExp[];
}> = [
  {
    role: 'Full Stack Engineer',
    category: 'Engineering',
    titlePatterns: [/full[\s-]?stack/, /fullstack/],
    tagPatterns: [/full[\s-]?stack/, /fullstack/]
  },
  {
    role: 'Frontend Engineer',
    category: 'Engineering',
    titlePatterns: [/frontend/, /front[-\s]?end/, /\bui engineer\b/, /\breact engineer\b/],
    tagPatterns: [/frontend/, /front[-\s]?end/, /\breact\b/, /\bvue\b/, /\bcss\b/, /\bhtml\b/]
  },
  {
    role: 'Backend Engineer',
    category: 'Engineering',
    titlePatterns: [/backend/, /back[-\s]?end/, /\bapi engineer\b/, /\bserver[-\s]?side\b/],
    tagPatterns: [/backend/, /\bapi\b/, /\bweb dev\b/, /\bnode\b/, /\bpython\b/, /\bgolang\b/, /\bjavascript\b/, /\bsoftware engineering\b/]
  },
  {
    role: 'DevOps Engineer',
    category: 'DevOps',
    titlePatterns: [/\bdevops\b/, /\bsre\b/, /site reliability/, /\bplatform engineer\b/],
    tagPatterns: [/\bdevops\b/, /\bsre\b/, /\bops\b/, /\bplatform\b/, /\binfra\b/]
  },
  {
    role: 'Cloud Engineer',
    category: 'Cloud',
    titlePatterns: [/\bcloud\b/, /\binfrastructure engineer\b/, /\binfra engineer\b/],
    tagPatterns: [/\bcloud\b/, /\baws\b/, /\bazure\b/, /\bgcp\b/, /\binfra\b/]
  },
  {
    role: 'Data Engineer',
    category: 'Data',
    titlePatterns: [/\bdata engineer\b/, /data pipeline/, /analytics engineer/],
    tagPatterns: [/\bdata\b/, /\bsql\b/, /\banalytics\b/, /\bwarehouse\b/]
  },
  {
    role: 'AI Engineer',
    category: 'AI / ML',
    titlePatterns: [/\bai engineer\b/, /\bartificial intelligence\b/, /\bgenerative ai\b/],
    tagPatterns: [/\bai\b/, /\blm\b/, /\bllm\b/, /\bgenerative ai\b/]
  },
  {
    role: 'ML Engineer',
    category: 'AI / ML',
    titlePatterns: [/\bml engineer\b/, /\bmachine learning\b/, /\bml ops\b/, /\bmlops\b/],
    tagPatterns: [/\bml\b/, /\bmachine learning\b/, /\bmlops\b/, /\bml ops\b/]
  },
  {
    role: 'Security Engineer',
    category: 'Security',
    titlePatterns: [/\bsecurity engineer\b/, /\bcyber security\b/, /\bcybersecurity\b/, /\binfosec\b/],
    tagPatterns: [/\bsecurity\b/, /\binfosec\b/, /\bcybersecurity\b/, /\bcyber security\b/]
  },
  {
    role: 'QA Engineer',
    category: 'QA / Testing',
    titlePatterns: [/\bqa\b/, /\bquality assurance\b/, /\btest automation\b/, /\bsoftware test\b/, /\btesting\b/],
    tagPatterns: [/\bqa\b/, /\btesting\b/, /\btest automation\b/, /\bquality assurance\b/]
  },
  {
    role: 'Software Engineer',
    category: 'Engineering',
    titlePatterns: [/\bsoftware engineer\b/, /\bsoftware developer\b/],
    tagPatterns: [/\bsoftware engineering\b/, /\bdeveloper\b/, /\bengineer\b/]
  }
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function classifyJob(job: NormalizedJob): ClassifiedJob | null {
  const titleText = normalizeText(job.title);
  const tagText = normalizeText(job.tags.join(' '));
  const combinedText = `${titleText} ${tagText}`;
  const titleHasNonTechnical = nonTechnicalPatterns.some((pattern) => pattern.test(titleText));
  const titleHasTechnicalSignal = roleMatchers.some((entry) =>
    entry.titlePatterns.some((pattern) => pattern.test(titleText))
  );

  if (titleHasNonTechnical && !titleHasTechnicalSignal) {
    return null;
  }

  for (const entry of roleMatchers) {
    const titleMatch = entry.titlePatterns.some((pattern) => pattern.test(titleText));
    const tagMatch = entry.tagPatterns.some((pattern) => pattern.test(tagText));
    if (titleMatch || tagMatch || entry.titlePatterns.some((pattern) => pattern.test(combinedText))) {
      return {
        ...job,
        category: entry.category,
        role: entry.role
      };
    }
  }

  return null;
}
