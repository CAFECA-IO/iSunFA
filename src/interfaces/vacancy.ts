import { z } from 'zod';
import { IVacancyValidator, IVacancyDetailValidator } from '@/lib/utils/zod_schema/vacancy';

export type IVacancy = z.infer<typeof IVacancyValidator>;
export type IVacancyDetail = z.infer<typeof IVacancyDetailValidator>;

export interface IVacancyUI extends IVacancyDetail {
  isFavorite: boolean;
}

export const dummyVacancyList: IVacancyDetail[] = [
  {
    id: 1,
    title: 'Front-end Developer',
    location: 'Taipei',
    date: 1743533087,
    description: `As a Frontend Engineer, you'll design, develop, and optimize user interfaces for web and mobile applications. You'll work with modern frameworks (e.g., React, Vue, Angular) to build seamless, responsive, and high-performing experiences. Collaborating with designers and backend developers, you'll ensure smooth functionality, maintain code quality, and enhance user interactions. Strong proficiency in HTML, CSS, JavaScript, and UI/UX principles is essential.`,
    responsibilities: [
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
    isOpen: true,
  },
  {
    id: 2,
    title: 'Back-end Developer',
    location: 'Taipei',
    date: 1743473634,
    description: `As a Backend Engineer, you'll design, develop, and maintain server-side logic for web and mobile applications. You'll work with databases, APIs, and cloud services to build scalable, secure, and efficient systems. Collaborating with frontend developers and DevOps engineers, you'll ensure smooth functionality, maintain code quality, and optimize performance. Strong proficiency in Node.js, Python, Java, or Go is essential.`,
    responsibilities: [
      'Design, develop, and maintain server-side logic and APIs.',
      'Collaborate with frontend developers to integrate user interfaces with server-side systems.',
      'Optimize applications for speed, scalability, and security.',
      'Ensure data integrity, reliability, and performance.',
      'Write clean, maintainable, and scalable code using modern frameworks (Express, Django, Spring).',
      'Debug and troubleshoot backend issues to enhance system performance.',
    ],
    requirements: [
      'Proficiency in Node.js, Python, Java, or Go.',
      'Experience with backend frameworks (Express, Django, Spring).',
      'Strong understanding of databases, APIs, and cloud services.',
      'Familiarity with RESTful APIs and microservices architecture.',
      'Ability to debug, test, and optimize server-side applications.',
      'Strong problem-solving skills and attention to detail.',
      'Experience with version control (Git) and backend build tools.',
    ],
    extraSkills: [
      'Experience with TypeScript for scalable code.',
      'Knowledge of Web3, AI, or AR/VR technologies.',
      'Familiarity with GraphQL, Docker, or Kubernetes.',
      'Understanding of frontend basics (HTML, CSS, JavaScript).',
      'Performance optimization and security best practices.',
      'Experience with CI/CD and testing frameworks.',
      'DevOps skills for deployment and monitoring.',
    ],
    isOpen: true,
  },
  {
    id: 3,
    title: 'Full-stack Developer',
    location: 'Kaohsiung',
    date: 1746414181,
    description: `As a Fullstack Engineer, you'll design, develop, and deploy end-to-end solutions for web and mobile applications. You'll work with frontend and backend technologies to build seamless, responsive, and scalable systems. Collaborating with designers, backend developers, and DevOps engineers, you'll ensure smooth functionality, maintain code quality, and optimize performance. Strong proficiency in full-stack development is essential.`,
    responsibilities: [
      'Design, develop, and deploy end-to-end solutions for web and mobile applications.',
      'Collaborate with designers, frontend developers, and backend engineers to create seamless experiences.',
      'Optimize applications for speed, scalability, and security.',
      'Ensure cross-browser and cross-device compatibility.',
      'Write clean, maintainable, and scalable code using modern frameworks (React, Vue, Angular, Node.js, Django, Spring).',
      'Debug and troubleshoot UI and backend issues to enhance user experience.',
    ],
    requirements: [
      'Proficiency in HTML, CSS, JavaScript, Node.js, Python, Java, or Go.',
      'Experience with modern frameworks (React, Vue, Angular, Express, Django, Spring).',
      'Strong understanding of responsive design, UI/UX principles, and databases.',
      'Familiarity with RESTful APIs, microservices architecture, and cloud services.',
      'Ability to debug, test, and optimize end-to-end applications.',
      'Strong problem-solving skills and attention to detail.',
      'Experience with version control (Git) and full-stack build tools.',
    ],
    extraSkills: [
      'Experience with TypeScript for scalable code.',
      'Knowledge of Web3, AI, or AR/VR technologies.',
      'Familiarity with GraphQL, Docker, or Kubernetes.',
      'Understanding of frontend and backend basics.',
      'Performance optimization and security best practices.',
      'Experience with CI/CD and testing frameworks.',
      'DevOps skills for deployment and monitoring.',
    ],
    isOpen: true,
  },
];
