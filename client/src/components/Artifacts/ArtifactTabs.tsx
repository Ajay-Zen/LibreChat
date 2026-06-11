import { useRef, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { apiBaseUrl } from 'librechat-data-provider';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import type { editor } from 'monaco-editor';
import type { Artifact } from '~/common';
import { useCodeState } from '~/Providers/EditorContext';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { useGetStartupConfig } from '~/data-provider';
import { isMediaArtifact, TOOL_ARTIFACT_TYPES } from '~/utils/artifacts';
import { ArtifactPreview } from './ArtifactPreview';

/**
 * Resolve a stored file URL to something the browser can fetch. Absolute
 * URLs, data URIs, and composer object URLs (`blob:`) are used as-is;
 * server-relative paths (`/api/...`, `/images/...`) are prefixed with the
 * API base — mirroring the chat image renderer.
 */
function resolveMediaUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/.test(url)) {
    return url;
  }
  return `${apiBaseUrl()}${url}`;
}

function MediaArtifact({ artifact }: { artifact: Artifact }) {
  const src = resolveMediaUrl(artifact.content ?? '');
  if (!src) {
    return null;
  }
  if (artifact.type === TOOL_ARTIFACT_TYPES.PDF) {
    return <iframe title={artifact.title ?? 'PDF'} src={src} className="h-full w-full border-0" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-surface-primary-alt p-2">
      <img
        src={src}
        alt={artifact.title ?? 'Image preview'}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export default function ArtifactTabs({
  artifact,
  previewRef,
  isSharedConvo,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
  isSharedConvo?: boolean;
}) {
  const { currentCode, setCurrentCode } = useCodeState();
  const { data: startupConfig } = useGetStartupConfig();
  const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (artifact.id !== lastIdRef.current) {
      setCurrentCode(undefined);
    }
    lastIdRef.current = artifact.id;
  }, [setCurrentCode, artifact.id]);

  const { files, fileKey, template, sharedProps } = useArtifactProps({ artifact });

  if (isMediaArtifact(artifact.type)) {
    return (
      <Tabs.Content
        value="preview"
        className="h-full w-full flex-grow overflow-hidden"
        tabIndex={-1}
      >
        <MediaArtifact artifact={artifact} />
      </Tabs.Content>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs.Content
        value="code"
        id="artifacts-code"
        className="h-full w-full flex-grow overflow-auto"
        tabIndex={-1}
      >
        <ArtifactCodeEditor artifact={artifact} monacoRef={monacoRef} readOnly={isSharedConvo} />
      </Tabs.Content>

      <Tabs.Content
        value="preview"
        className="h-full w-full flex-grow overflow-hidden"
        tabIndex={-1}
      >
        <ArtifactPreview
          files={files}
          fileKey={fileKey}
          template={template}
          previewRef={previewRef}
          sharedProps={sharedProps}
          currentCode={currentCode}
          startupConfig={startupConfig}
        />
      </Tabs.Content>
    </div>
  );
}
