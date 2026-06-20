import React from 'react';
import { useSignedPhotoUrl } from '../../hooks/useSignedPhotoUrl';

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  photoId: string;
  fallbackUrl: string;
}

/**
 * [NV-03] Component to dynamically render images via secure signed storage URLs
 */
export const SignedImage: React.FC<SignedImageProps> = ({ photoId, fallbackUrl, ...props }) => {
  const { url } = useSignedPhotoUrl(photoId, fallbackUrl);
  return <img src={url} {...props} />;
};

export default SignedImage;
