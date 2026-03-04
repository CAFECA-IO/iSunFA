'use client';

import { useState, useEffect } from 'react';

interface ISubtitleTypewriterProps {
  lines: string[];
}

export default function SubtitleTypewriter({ lines }: ISubtitleTypewriterProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentLine = lines[currentLineIndex];

    const handleTyping = () => {
      if (isDeleting) {
        setDisplayedText((prev) => prev.slice(0, -1));
      } else {
        setDisplayedText((prev) => currentLine.slice(0, prev.length + 1));
      }

      if (!isDeleting && displayedText === currentLine) {
        // Info: (20260104 - Luphia) Finished typing, pause before deleting
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && displayedText === '') {
        // Info: (20260104 - Luphia) Finished deleting, move to next line
        setIsDeleting(false);
        setCurrentLineIndex((prev) => (prev + 1) % lines.length);
      }
    };

    // Info: (20260104 - Luphia) Calculate typing speed to finish in 3 seconds (3000ms)
    // Info: (20260104 - Luphia) Avoid division by zero by ensuring length is at least 1
    const typingSpeed = isDeleting ? 50 : (3000 / Math.max(currentLine.length, 1));

    const timer = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentLineIndex, lines]);

  return (
    <span className="inline-block min-h-[1.5em]">
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
