import { FileSources } from 'librechat-data-provider';
import ImagePreview from './ImagePreview';
import RemoveFile from './RemoveFile';

const Image = ({
  imageBase64,
  url,
  onDelete,
  progress = 1,
  source = FileSources.local,
  onPreview,
}: {
  imageBase64?: string;
  url?: string;
  onDelete: () => void;
  progress: number; // between 0 and 1
  source?: FileSources;
  /** When provided, tapping the thumbnail opens the right-side preview
   * instead of the full-size modal. */
  onPreview?: () => void;
}) => {
  return (
    <div className="group relative inline-block text-sm text-black/70 dark:text-white/90">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600">
        <ImagePreview
          source={source}
          imageBase64={imageBase64}
          url={url}
          progress={progress}
          onPreview={onPreview}
        />
      </div>
      <RemoveFile onRemove={onDelete} />
    </div>
  );
};

export default Image;
