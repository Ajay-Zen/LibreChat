import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { FileSources } from 'librechat-data-provider';
import type { ExtendedFile } from '~/common';
import FileRow from '../FileRow';
import store from '~/store';

jest.mock('~/hooks', () => ({
  useLocalize: () => (k: string) => k,
}));
jest.mock('~/data-provider', () => ({
  useDeleteFilesMutation: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('~/hooks/Files', () => ({
  useFileDeletion: () => ({ deleteFile: jest.fn() }),
}));
jest.mock('~/utils', () => ({
  logger: { log: jest.fn() },
  getCachedPreview: () => undefined,
  cn: (...a: unknown[]) => a.filter(Boolean).join(' '),
  getFileType: () => ({ title: 'File', fill: '', paths: null }),
}));

jest.mock('../FilePreview', () => ({
  __esModule: true,
  default: () => null,
}));

function Probe() {
  const id = useRecoilValue(store.currentArtifactId);
  const visible = useRecoilValue(store.artifactsVisibility);
  return <div data-testid="probe">{`${id ?? 'null'}|${visible}`}</div>;
}

function renderWithFile(file: ExtendedFile) {
  const files = new Map<string, ExtendedFile>([[file.file_id, file]]);
  return render(
    <RecoilRoot>
      <Probe />
      <FileRow files={files} setFiles={jest.fn()} />
    </RecoilRoot>,
  );
}

const imageFile: ExtendedFile = {
  file_id: 'img-1',
  type: 'image/png',
  filename: 'chart.png',
  filepath: '/images/chart.png',
  preview: 'blob:fake-preview',
  size: 1234,
  progress: 1,
  source: FileSources.local,
};

describe('FileRow tap-to-preview (composer)', () => {
  it('opens the right-side preview when an image chip is tapped', () => {
    renderWithFile(imageFile);
    expect(screen.getByTestId('probe')).toHaveTextContent('null|');
    const trigger = screen.getByRole('button', { name: /view .* in full size/i });
    fireEvent.click(trigger);
    expect(screen.getByTestId('probe')).toHaveTextContent('tool-artifact-img-1|true');
  });

  it('opens the right-side preview when a CSV file chip is tapped (client-side read)', async () => {
    const csvFile: ExtendedFile = {
      file_id: 'csv-1',
      type: 'text/csv',
      filename: 'data.csv',
      filepath: '/api/files/data.csv',
      size: 8,
      progress: 1,
      source: FileSources.local,
      file: new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' }),
    };
    renderWithFile(csvFile);
    const trigger = screen.getByRole('button', { name: /data\.csv/i });
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('tool-artifact-csv-1|true'),
    );
  });
});
