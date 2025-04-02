export interface IJob {
  id: number;
  title: string;
  location: string;
  date: number;
  description: string;
}

export interface IJobDetail extends IJob {
  jobResponsibilities: string[];
  requirements: string[];
  extraSkills: string[];
}

export const dummyJobList: IJobDetail[] = [
  {
    id: 1,
    title: 'Front-end Developer',
    location: 'Taipei, TW',
    date: 1743473634,
    description: `As a Frontend Engineer, you'll design, develop, and optimize user interfaces for web and mobile applications. You'll work with modern frameworks (e.g., React, Vue, Angular) to build seamless, responsive, and high-performing experiences. Collaborating with designers and backend developers, you'll ensure smooth functionality, maintain code quality, and enhance user interactions. Strong proficiency in HTML, CSS, JavaScript, and UI/UX principles is essential.`,
    jobResponsibilities: [
      'Develop and maintain responsive, user-friendly web interfaces.',
      'Collaborate with designers and backend engineers to create seamless experiences.',
      'Optimize applications for speed and performance.',
      'Ensure cross-browser and cross-device compatibility.',
      'Write clean, maintainable, and scalable code using modern frameworks (React, Vue, Angular).',
      'Debug and troubleshoot UI issues to enhance user experience.',
    ],
    requirements: [
      'Proficiency in HTML, CSS, and JavaScript.',
      'Experience with modern frameworks (React, Vue, or Angular).',
      'Strong understanding of responsive design and UI/UX principles.',
      'Familiarity with RESTful APIs and state management (Redux, Vuex, etc.).',
      'Ability to debug, test, and optimize web applications.',
      'Strong problem-solving skills and attention to detail.',
      'Experience with version control (Git) and frontend build tools.',
    ],
    extraSkills: [
      'Experience with TypeScript for scalable code.',
      'Knowledge of Web3, AI, or AR/VR technologies.',
      'Familiarity with animation libraries (GSAP, Framer Motion).',
      'Understanding of backend basics (Node.js, GraphQL).',
      'UI/UX design experience with Figma or Adobe XD.',
      'Performance optimization and accessibility best practices.',
      'Experience with CI/CD and testing frameworks.',
    ],
  },
];
