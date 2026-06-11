import React, { useState } from 'react';
import { Download, CircleCheckBig } from 'lucide-react';
import type { Artifact } from '~/common';
import { Button } from '@librechat/client';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useCodeState } from '~/Providers/EditorContext';
import { isMediaArtifact } from '~/utils/artifacts';
import { useLocalize } from '~/hooks';

const DownloadArtifact = ({ artifact }: { artifact: Artifact }) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { fileKey: fileName } = useArtifactProps({ artifact });

  const markDownloaded = () => {
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 3000);
  };

  const handleDownload = () => {
    try {
      /* Media artifacts (image/pdf) store a fetchable URL in `content`,
       * not text — link straight to it rather than wrapping the URL
       * string in a Blob. */
      if (isMediaArtifact(artifact.type)) {
        const href = artifact.content ?? '';
        if (!href) {
          return;
        }
        const link = document.createElement('a');
        link.href = href;
        link.download = artifact.title ?? fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        markDownloaded();
        return;
      }

      const content = currentCode ?? artifact.content ?? '';
      if (!content) {
        return;
      }
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      markDownloaded();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-9 w-9"
      onClick={handleDownload}
      aria-label={localize('com_ui_download_artifact')}
    >
      {isDownloaded ? (
        <CircleCheckBig size={16} aria-hidden="true" />
      ) : (
        <Download size={16} aria-hidden="true" />
      )}
    </Button>
  );
};

export default DownloadArtifact;
