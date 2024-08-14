import React from 'react';

const InformationStatement: React.FC = () => {
  return (
    <div className="p-6 space-y-4 text-navyBlue">
      <p className="font-semibold">Dear User,</p>
      <p>
        Thank you for choosing to use our accounting software. During your use
        of this software, we may collect and process some of your personal
        information. This statement aims to inform you about the information we
        collect, how it is used, and how we protect your privacy.
      </p>

      <p className="font-semibold">1. Types of Information Collected</p>
      <p>
        During your use of the accounting software, we may collect the following
        information:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Personal Identification Information:</strong> Including but
          not limited to your name, email address, phone number, company name,
          etc.
        </li>
        <li>
          <strong>Usage Data:</strong> Such as your operation records within the
          software, usage duration, access frequency, etc.
        </li>
        <li>
          <strong>Technical Information:</strong> Such as IP address, device
          information, operating system, browser type, etc.
        </li>
      </ul>

      <p className="font-semibold">2. Use of Information</p>
      <p>The information we collect will primarily be used for the following purposes:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Providing and Maintaining Services:</strong> Ensuring the
          normal operation of the accounting software and improving the user
          experience.
        </li>
        <li>
          <strong>Personalized Services:</strong> Providing customized features
          and recommendations based on your needs and preferences.
        </li>
        <li>
          <strong>Customer Support:</strong> Addressing your questions, handling
          your requests and complaints.
        </li>
        <li>
          <strong>Security Assurance:</strong> Detecting and preventing
          potential security threats, protecting your data security.
        </li>
        <li>
          <strong>Data Analysis:</strong> Conducting statistical analysis to
          improve our products and services.
        </li>
      </ul>

      <p className="font-semibold">3. Protection of Information</p>
      <p>
        We commit to taking reasonable technical and organizational measures to
        protect your personal information from unauthorized access, disclosure,
        alteration, or destruction. These measures include but are not limited to:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Data Encryption:</strong> Encrypting sensitive data.
        </li>
        <li>
          <strong>Access Control:</strong> Restricting data access rights to
          employees and third parties.
        </li>
        <li>
          <strong>Regular Audits:</strong> Regularly reviewing our security
          measures and policies.
        </li>
      </ul>

      <p className="font-semibold">4. Sharing of Information</p>
      <p>
        We will not sell, rent, or trade your personal information to any third
        party without your consent. However, we may share your information in the
        following circumstances:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Legal Requirements:</strong> When required by law or requested
          by government authorities.
        </li>
        <li>
          <strong>Service Providers:</strong> With third-party service providers
          who work with us, provided they only use your information to perform
          our instructions and comply with appropriate confidentiality and
          security measures.
        </li>
        <li>
          <strong>Business Transfers:</strong> In the event of a company merger,
          acquisition, or asset sale, we may transfer your information.
        </li>
      </ul>

      <p className="font-semibold">5. Your Rights</p>
      <p>
        You have the right to access, correct, or delete your personal
        information at any time. If you wish to exercise these rights or have
        any questions, please contact us via:
      </p>
      <p>Email: support@isunfa.com</p>
      <p>Phone: +123-456-7890</p>
      <p>
        We will strive to respond to your request within a reasonable time frame.
      </p>

      <p className="font-semibold">6. Changes to the Statement</p>
      <p>
        We may update this statement from time to time to reflect changes in our
        information handling practices. When we make significant changes to this
        statement, we will notify you through in-software notifications or via
        email.
      </p>

      <p>Thank you for your trust and support in our accounting software!</p>
      <p className="font-semibold">iSunFA  August 6, 2024</p>
    </div>
  );
};

export default InformationStatement;
