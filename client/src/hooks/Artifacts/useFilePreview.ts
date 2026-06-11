import { useCallback } from 'react';
import { useRecoilValue, useSetRecoilState, useResetRecoilState } from 'recoil';
import type { TFile, TAttachment } from 'librechat-data-provider';
import type { Artifact, ExtendedFile } from '~/common';
import {
  fileToArtifact,
  toolArtifactKey,
  fileToPreviewArtifact,
  TOOL_ARTIFACT_TYPES,
} from '~/utils/artifacts';
import store from '~/store';

type PreviewableFile = Partial<TFile | TAttachment | ExtendedFile>;

/** Text-based extensions we can preview client-side by reading the staged
 * file before it's uploaded/extracted. Binary office formats are excluded —
 * their rich preview is produced server-side and only available after send. */
const TEXT_PREVIEW_EXT =
  /\.(csv|tsv|txt|text|log|json|ya?ml|xml|md|markdown|ini|conf|env|toml|js|jsx|ts|tsx|py|rb|go|rs|java|c|cc|cpp|h|hpp|cs|php|sh|bash|zsh|sql|css|scss|less|html?|svg)$/i;
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

function localBlob(file: PreviewableFile): File | undefined {
  return (file as ExtendedFile).file;
}

function isTextLike(file: PreviewableFile): boolean {
  const name = (file as TFile).filename ?? localBlob(file)?.name ?? '';
  const type = (file as TFile).type ?? '';
  return type.startsWith('text/') || TEXT_PREVIEW_EXT.test(name);
}

/** Read a blob as text via FileReader (supported in every browser; avoids
 * `Blob.text()` which isn't available in some test/older environments). */
function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(blob);
  });
}

/**
 * Opens a tapped attachment in the right-side artifact panel — the same
 * mechanism the code-interpreter output cards use. Images/PDFs render
 * directly; html/react/markdown/code/office go through the Sandpack
 * pipeline. For composer-staged files that have no extracted text yet,
 * `previewFile` reads the local file client-side so text-based formats
 * (CSV, JSON, code, …) still preview before sending.
 */
export default function useFilePreview() {
  const currentArtifactId = useRecoilValue(store.currentArtifactId);
  const setArtifacts = useSetRecoilState(store.artifactsState);
  const setCurrentArtifactId = useSetRecoilState(store.currentArtifactId);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);
  const setVisible = useSetRecoilState(store.artifactsVisibility);

  /** Reveal an artifact (or toggle it closed when already active). */
  const reveal = useCallback(
    (artifact: Artifact, toggle: boolean): void => {
      if (toggle && artifact.id === currentArtifactId) {
        resetCurrentArtifactId();
        setVisible(false);
        return;
      }
      setArtifacts((prev) => ({ ...(prev ?? {}), [artifact.id]: artifact }));
      setCurrentArtifactId(artifact.id);
      setVisible(true);
    },
    [currentArtifactId, resetCurrentArtifactId, setArtifacts, setCurrentArtifactId, setVisible],
  );

  const openPreview = useCallback(
    (file: PreviewableFile): boolean => {
      const artifact = fileToPreviewArtifact(file as Parameters<typeof fileToPreviewArtifact>[0]);
      if (!artifact) {
        return false;
      }
      reveal(artifact, false);
      return true;
    },
    [reveal],
  );

  const togglePreview = useCallback(
    (file: PreviewableFile): boolean => {
      const artifact = fileToPreviewArtifact(file as Parameters<typeof fileToPreviewArtifact>[0]);
      if (!artifact) {
        return false;
      }
      reveal(artifact, true);
      return true;
    },
    [reveal],
  );

  /**
   * Async variant for composer-staged files: falls back to reading the
   * local file content when there's no URL/text to preview yet. Returns
   * `false` only when the file is binary and unpreviewable pre-send.
   */
  const previewFile = useCallback(
    async (file: PreviewableFile): Promise<boolean> => {
      const direct = fileToPreviewArtifact(file as Parameters<typeof fileToPreviewArtifact>[0]);
      if (direct) {
        reveal(direct, true);
        return true;
      }
      const blob = localBlob(file);
      if (!blob || !isTextLike(file) || blob.size > MAX_TEXT_PREVIEW_BYTES) {
        return false;
      }
      const text = await readBlobAsText(blob);
      const withText = { ...(file as object), text } as Parameters<typeof fileToArtifact>[0];
      const artifact =
        fileToArtifact(withText) ??
        ({
          id: toolArtifactKey(file as Parameters<typeof toolArtifactKey>[0]),
          type: TOOL_ARTIFACT_TYPES.PLAIN_TEXT,
          title: (file as TFile).filename ?? blob.name ?? 'File',
          content: text,
          lastUpdateTime: 0,
        } satisfies Artifact);
      reveal(artifact, true);
      return true;
    },
    [reveal],
  );

  return { openPreview, togglePreview, previewFile, currentArtifactId };
}
