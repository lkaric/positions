import { useState } from 'react';

import { ClipboardIcon, ClipboardCheckIcon } from 'lucide-react';

import { Button } from '../ui';

interface CopyButtonProps {
  value: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleCopy}>
      {copied ? <ClipboardCheckIcon /> : <ClipboardIcon />}
    </Button>
  );
};

export { CopyButton };
