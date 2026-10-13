import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import { API_BASE } from "@/lib/api";

type FileRouter = {
  productImageUploader: any;
  avatarUploader: any;
};

const url = `${API_BASE}/api/uploadthing`;

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<FileRouter>({ url });

export const UploadButton = generateUploadButton<FileRouter>({ url });

export const UploadDropzone = generateUploadDropzone<FileRouter>({ url });
