import React from 'react';

interface IQuestionBubbleProps {
  questionContent: string;
}

const QuestionBubble: React.FC<IQuestionBubbleProps> = ({ questionContent }) => {
  return (
    <div className="ml-auto w-fit min-w-300px whitespace-pre-wrap rounded-lg border border-chat-bubbles-surface-primary bg-chat-bubbles-surface-primary p-20px font-medium text-chat-bubbles-text-primary">
      {questionContent}
    </div>
  );
};

export default QuestionBubble;
